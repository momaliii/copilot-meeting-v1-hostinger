import crypto from 'crypto';
import net from 'net';
import IPCIDR from 'ip-cidr';
import type { Request, Response, NextFunction } from 'express';
import db from '../db.ts';

// ---------------------------------------------------------------------------
// IP and CIDR validation
// ---------------------------------------------------------------------------
export function isValidIP(ip: string): boolean {
  return net.isIP(ip) !== 0;
}

export function isValidCIDR(cidr: string): boolean {
  return IPCIDR.isValidCIDR(cidr);
}

function isValidIPOrCIDR(value: string): boolean {
  if (value.includes('/')) return isValidCIDR(value);
  return isValidIP(value);
}

// ---------------------------------------------------------------------------
// In-memory IP blocklist (loaded from DB on startup, synced on changes)
// ---------------------------------------------------------------------------
const blockedIPs = new Set<string>();
const blockedCIDRs: IPCIDR[] = [];

export async function loadBlockedIPs(): Promise<void> {
  try {
    const { rows } = await db.query('SELECT ip FROM blocked_ips');
    blockedIPs.clear();
    blockedCIDRs.length = 0;
    for (const r of rows || []) {
      const entry = (r as any).ip;
      if (entry.includes('/')) {
        try {
          blockedCIDRs.push(new IPCIDR(entry));
        } catch (_) {
          // Invalid CIDR in DB, skip
        }
      } else {
        blockedIPs.add(entry);
      }
    }
  } catch (e) {
    console.error('[security] loadBlockedIPs failed:', e);
  }
}

export async function blockIP(ipOrCidr: string, reason: string, blockedBy: string): Promise<void> {
  if (!isValidIPOrCIDR(ipOrCidr)) {
    throw new Error('Invalid IP address or CIDR');
  }
  if (ipOrCidr.includes('/')) {
    blockedCIDRs.push(new IPCIDR(ipOrCidr));
  } else {
    blockedIPs.add(ipOrCidr);
  }
  try {
    await db.run(
      'INSERT INTO blocked_ips (ip, reason, blocked_by) VALUES (?, ?, ?)',
      [ipOrCidr, reason, blockedBy]
    );
    await logSecurityEvent('ip_blocked', ipOrCidr, null, '/admin', `Blocked by ${blockedBy}: ${reason}`);
  } catch (e) {
    if (ipOrCidr.includes('/')) {
      blockedCIDRs.pop();
    } else {
      blockedIPs.delete(ipOrCidr);
    }
    console.error('[security] blockIP failed:', e);
    throw e;
  }
}

export async function unblockIP(ipOrCidr: string): Promise<void> {
  if (ipOrCidr.includes('/')) {
    const idx = blockedCIDRs.findIndex((c) => c.toString() === ipOrCidr);
    if (idx >= 0) blockedCIDRs.splice(idx, 1);
  } else {
    blockedIPs.delete(ipOrCidr);
  }
  try {
    await db.run('DELETE FROM blocked_ips WHERE ip = ?', [ipOrCidr]);
  } catch (e) {
    console.error('[security] unblockIP failed:', e);
    throw e;
  }
}

export function isIPBlocked(ip: string): boolean {
  if (blockedIPs.has(ip)) return true;
  for (const cidr of blockedCIDRs) {
    try {
      if (cidr.contains(ip)) return true;
    } catch (_) {
      // Invalid IP for this CIDR, skip
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Admin IP allowlist (when ADMIN_ALLOWED_IPS is set)
// ---------------------------------------------------------------------------
function isIPInAllowlist(ip: string, allowlist: string[]): boolean {
  for (const entry of allowlist) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    if (trimmed.includes('/')) {
      try {
        if (new IPCIDR(trimmed).contains(ip)) return true;
      } catch (_) {}
    } else if (ip === trimmed) {
      return true;
    }
  }
  return false;
}

export function adminAllowlistMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowed = process.env.ADMIN_ALLOWED_IPS;
  if (!allowed) return next();
  const ip = getClientIP(req);
  const list = allowed.split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return next();
  if (!isIPInAllowlist(ip, list)) {
    void logSecurityEvent('blocked_request', ip, (req as any).user?.id || null, req.path, 'Admin access denied: IP not in allowlist');
    res.status(403).json({ error: 'Admin access restricted to allowed IPs only.' });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// Security event logger
// ---------------------------------------------------------------------------
export async function logSecurityEvent(
  eventType: string,
  ipAddress: string | null,
  userId: string | null,
  path: string | null,
  details: string | null,
): Promise<void> {
  try {
    const id = `sec-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    await db.run(
      'INSERT INTO security_events (id, event_type, ip_address, user_id, path, details) VALUES (?, ?, ?, ?, ?, ?)',
      [id, eventType, ipAddress, userId, path, details]
    );
  } catch (e) {
    console.error('[security] logSecurityEvent failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Account lockout helpers (configurable via env)
// ---------------------------------------------------------------------------
const LOCKOUT_MAX_ATTEMPTS = parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '5', 10);
const LOCKOUT_WINDOW_MINUTES = parseInt(process.env.LOCKOUT_WINDOW_MINUTES || '15', 10);
const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10);
const LOCKOUT_WINDOW_MS = LOCKOUT_WINDOW_MINUTES * 60 * 1000;
const LOCKOUT_DURATION_MS = LOCKOUT_DURATION_MINUTES * 60 * 1000;

export async function recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
  try {
    const id = `la-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    await db.run(
      'INSERT INTO login_attempts (id, email, ip_address, success) VALUES (?, ?, ?, ?)',
      [id, email.toLowerCase(), ip, success ? 1 : 0]
    );
    if (success) {
      await clearFailedAttempts(email);
    }
  } catch (e) {
    console.error('[security] recordLoginAttempt failed:', e);
  }
}

export async function clearFailedAttempts(email: string): Promise<void> {
  try {
    await db.run(
      'DELETE FROM login_attempts WHERE email = ? AND success = 0',
      [email.toLowerCase()]
    );
  } catch (e) {
    console.error('[security] clearFailedAttempts failed:', e);
  }
}

export async function isAccountLocked(email: string, ip: string): Promise<{ locked: boolean; remainingMs: number }> {
  try {
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS).toISOString();
    const row = await db.queryOne(
      'SELECT COUNT(*) as count, MAX(created_at) as last_attempt FROM login_attempts WHERE email = ? AND success = 0 AND created_at >= ?',
      [email.toLowerCase(), windowStart]
    );
    const failCount = Number(row?.count ?? 0);
    if (failCount >= LOCKOUT_MAX_ATTEMPTS) {
      const lastAttempt = row?.last_attempt ? new Date(row.last_attempt).getTime() : Date.now();
      const lockExpires = lastAttempt + LOCKOUT_DURATION_MS;
      const remaining = lockExpires - Date.now();
      if (remaining > 0) {
        return { locked: true, remainingMs: remaining };
      }
      await clearFailedAttempts(email);
    }
    return { locked: false, remainingMs: 0 };
  } catch (e) {
    console.error('[security] isAccountLocked failed:', e);
    return { locked: false, remainingMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// IP-based login lockout (blocks brute-force across many emails from same IP)
// ---------------------------------------------------------------------------
const IP_LOCKOUT_THRESHOLD = parseInt(process.env.IP_LOCKOUT_THRESHOLD || '20', 10);
const IP_LOCKOUT_WINDOW_MS = LOCKOUT_WINDOW_MS;
const IP_AUTO_BLOCK_THRESHOLD = parseInt(process.env.IP_AUTO_BLOCK_THRESHOLD || '50', 10);

export async function isIPLoginLocked(ip: string): Promise<{ locked: boolean; remainingMs: number; failCount: number }> {
  try {
    const windowStart = new Date(Date.now() - IP_LOCKOUT_WINDOW_MS).toISOString();
    const row = await db.queryOne(
      'SELECT COUNT(*) as count, MAX(created_at) as last_attempt FROM login_attempts WHERE ip_address = ? AND success = 0 AND created_at >= ?',
      [ip, windowStart]
    );
    const failCount = Number(row?.count ?? 0);
    if (failCount >= IP_LOCKOUT_THRESHOLD) {
      const lastAttempt = row?.last_attempt ? new Date(row.last_attempt).getTime() : Date.now();
      const lockExpires = lastAttempt + LOCKOUT_DURATION_MS;
      const remaining = lockExpires - Date.now();
      if (remaining > 0) {
        return { locked: true, remainingMs: remaining, failCount };
      }
    }
    return { locked: false, remainingMs: 0, failCount };
  } catch (e) {
    console.error('[security] isIPLoginLocked failed:', e);
    return { locked: false, remainingMs: 0, failCount: 0 };
  }
}

export async function maybeAutoBlockIPAfterFailedLogins(ip: string, failCount: number): Promise<void> {
  if (failCount >= IP_AUTO_BLOCK_THRESHOLD && isValidIP(ip) && ip !== 'unknown') {
    try {
      blockedIPs.add(ip);
      await blockIP(ip, `Auto-blocked: ${failCount} failed login attempts from IP`, 'security_guard');
    } catch (e) {
      console.error('[security] maybeAutoBlockIPAfterFailedLogins failed:', e);
    }
  }
}

// ---------------------------------------------------------------------------
// Suspicious pattern detection
// ---------------------------------------------------------------------------
const SQL_INJECTION_RE = /(\b(union\s+(all\s+)?select|select\s+.*from|insert\s+into|update\s+.*set|delete\s+from|drop\s+(table|database)|alter\s+table|exec(\s+|\()|execute\s|xp_|sp_)\b|'(\s|%20)*(or|and)(\s|%20)*('|1\s*=\s*1)|--\s|;\s*(drop|delete|update|insert)\b)/i;
const SQL_INJECTION_EXTRA_RE = /(\b0x[0-9a-f]+|CHAR\s*\(|CONCAT\s*\(|benchmark\s*\(|LOAD_FILE\s*\(|INTO\s+OUTFILE|INFORMATION_SCHEMA\b)/i;
const PATH_TRAVERSAL_RE = /(\.\.(\/|\\|%2f|%5c|%252f|%255c))|(%2e%2e|%252e%252e)(\/|\\|%2f|%5c|%252f|%255c)|\.\.%2f|\.\.%5c/i;
const XSS_RE = /(<\s*script[\s>]|javascript\s*:|on(error|load|click|mouse|focus|blur)\s*=|<\s*iframe[\s>]|<\s*object[\s>]|<\s*embed[\s>]|<\s*svg[\s>].*on\w+\s*=)/i;

type ThreatType = 'sql_injection' | 'path_traversal' | 'xss' | null;

function detectThreat(value: string): ThreatType {
  if (SQL_INJECTION_RE.test(value)) return 'sql_injection';
  if (SQL_INJECTION_EXTRA_RE.test(value)) return 'sql_injection';
  if (PATH_TRAVERSAL_RE.test(value)) return 'path_traversal';
  if (XSS_RE.test(value)) return 'xss';
  return null;
}

function extractStrings(obj: unknown, depth = 0): string[] {
  if (depth > 5) return [];
  if (typeof obj === 'string') return [obj];
  if (Array.isArray(obj)) return obj.flatMap(item => extractStrings(item, depth + 1));
  if (obj && typeof obj === 'object') {
    return Object.values(obj).flatMap(val => extractStrings(val, depth + 1));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Client IP extraction (only trust X-Forwarded-For when TRUST_PROXY=true)
// ---------------------------------------------------------------------------
export function getClientIP(req: Request): string {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

// ---------------------------------------------------------------------------
// Security alert webhook (fire when event spike detected)
// ---------------------------------------------------------------------------
const SECURITY_ALERT_WEBHOOK = process.env.SECURITY_ALERT_WEBHOOK;
const SECURITY_ALERT_THRESHOLD = parseInt(process.env.SECURITY_ALERT_THRESHOLD || '10', 10);
const SECURITY_ALERT_WINDOW_MS = parseInt(process.env.SECURITY_ALERT_WINDOW_MINUTES || '5', 10) * 60 * 1000;
const SECURITY_ALERT_THROTTLE_MS = 15 * 60 * 1000; // 15 min

const securityEventTimestamps: number[] = [];
let lastWebhookFiredAt = 0;

async function maybeFireSecurityAlert(eventType: string, ip: string, path: string, details: string): Promise<void> {
  if (!SECURITY_ALERT_WEBHOOK) return;
  const now = Date.now();
  securityEventTimestamps.push(now);
  const windowStart = now - SECURITY_ALERT_WINDOW_MS;
  const recentCount = securityEventTimestamps.filter((t) => t >= windowStart).length;
  if (recentCount < SECURITY_ALERT_THRESHOLD) return;
  if (now - lastWebhookFiredAt < SECURITY_ALERT_THROTTLE_MS) return;
  lastWebhookFiredAt = now;
  // Prune old timestamps
  while (securityEventTimestamps.length > 0 && securityEventTimestamps[0] < windowStart) {
    securityEventTimestamps.shift();
  }
  try {
    await fetch(SECURITY_ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'security_spike',
        count: recentCount,
        windowMinutes: SECURITY_ALERT_WINDOW_MS / 60000,
        sampleEvent: { eventType, ip, path, details: details?.slice(0, 200) },
      }),
    });
  } catch (e) {
    console.error('[security] webhook failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Progressive response: track suspicious hits per IP, auto-block repeat offenders
// ---------------------------------------------------------------------------
const SUSPICIOUS_AUTO_BLOCK_THRESHOLD = parseInt(process.env.SUSPICIOUS_AUTO_BLOCK_THRESHOLD || '5', 10);
const SUSPICIOUS_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type SuspiciousEntry = { count: number; windowStart: number };

const suspiciousHitCounts = new Map<string, SuspiciousEntry>();

function recordSuspiciousHit(ip: string): boolean {
  if (ip === 'unknown' || !isValidIP(ip)) return false;
  const now = Date.now();
  const entry = suspiciousHitCounts.get(ip);
  if (!entry) {
    suspiciousHitCounts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (now - entry.windowStart > SUSPICIOUS_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    return false;
  }
  entry.count++;
  return entry.count >= SUSPICIOUS_AUTO_BLOCK_THRESHOLD;
}

function pruneSuspiciousMap(): void {
  const now = Date.now();
  for (const [ip, entry] of suspiciousHitCounts.entries()) {
    if (now - entry.windowStart > SUSPICIOUS_WINDOW_MS) {
      suspiciousHitCounts.delete(ip);
    }
  }
}

// ---------------------------------------------------------------------------
// Express middleware: IP block check + suspicious pattern detection
// ---------------------------------------------------------------------------
// securityGuard is mounted at /api, so req.path is relative (e.g. /analyze). Match relative paths.
const SKIP_SCAN_PATHS = ['/analyze', '/translate', '/meetings', '/sessions'];

const BLOCK_EMPTY_USER_AGENT = process.env.BLOCK_EMPTY_USER_AGENT === 'true';
const BLOCK_BOT_USER_AGENTS = process.env.BLOCK_BOT_USER_AGENTS === 'true';
const BOT_USER_AGENT_PATTERNS = /^(curl|wget|python-requests|Go-http-client|axios|node-fetch|java\/|perl|ruby\/|php\/|scrapy)/i;

export function securityGuard(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);

  const ua = req.headers['user-agent'];
  const uaStr = typeof ua === 'string' ? ua : '';
  if (!uaStr || uaStr.trim() === '') {
    if (BLOCK_EMPTY_USER_AGENT) {
      void logSecurityEvent('suspicious_pattern', ip, (req as any).user?.id || null, req.path, 'empty_user_agent');
      res.status(400).json({ error: 'Request blocked: User-Agent required.' });
      return;
    }
  } else if (BLOCK_BOT_USER_AGENTS && BOT_USER_AGENT_PATTERNS.test(uaStr)) {
    void logSecurityEvent('suspicious_pattern', ip, (req as any).user?.id || null, req.path, `bot_user_agent: ${uaStr.slice(0, 100)}`);
    res.status(400).json({ error: 'Request blocked: Automated clients not allowed.' });
    return;
  }

  if (isIPBlocked(ip)) {
    void logSecurityEvent('blocked_request', ip, null, req.path, 'IP on blocklist');
    void maybeFireSecurityAlert('blocked_request', ip, req.path, 'IP on blocklist');
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const shouldScan = !SKIP_SCAN_PATHS.some(p => req.path.startsWith(p));

  if (shouldScan) {
    const valuesToScan: string[] = [
      req.path,
      ...extractStrings(req.query),
      ...extractStrings(req.body),
      ...(req.headers['user-agent'] ? [req.headers['user-agent'] as string] : []),
    ];

    for (const val of valuesToScan) {
      const threat = detectThreat(val);
      if (threat) {
        const details = `${threat}: ${val.slice(0, 200)}`;
        void logSecurityEvent('suspicious_pattern', ip, (req as any).user?.id || null, req.path, details);
        void maybeFireSecurityAlert('suspicious_pattern', ip, req.path, details);
        const shouldAutoBlock = recordSuspiciousHit(ip);
        if (shouldAutoBlock) {
          blockedIPs.add(ip);
          void blockIP(ip, 'Auto-blocked: repeated suspicious patterns', 'security_guard').catch((e) =>
            console.error('[security] auto-block failed:', e)
          );
          res.status(403).json({ error: 'Access denied. Your IP has been blocked due to repeated malicious activity.' });
        } else {
          res.status(400).json({ error: 'Malicious request detected.' });
        }
        pruneSuspiciousMap();
        return;
      }
    }
  }

  next();
}

// ---------------------------------------------------------------------------
// Periodic cleanup: login attempts (24h) + security events (configurable retention)
// ---------------------------------------------------------------------------
const SECURITY_EVENTS_RETENTION_DAYS = parseInt(process.env.SECURITY_EVENTS_RETENTION_DAYS || '90', 10);

const BLOCKLIST_SYNC_INTERVAL_SEC = parseInt(process.env.BLOCKLIST_SYNC_INTERVAL_SEC || '0', 10);

export function startBlocklistSync(): NodeJS.Timeout | null {
  if (BLOCKLIST_SYNC_INTERVAL_SEC <= 0) return null;
  return setInterval(() => {
    void loadBlockedIPs();
  }, BLOCKLIST_SYNC_INTERVAL_SEC * 1000);
}

export function startSecurityCleanup(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const loginCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await db.run('DELETE FROM login_attempts WHERE created_at < ?', [loginCutoff]);
    } catch (e) {
      console.error('[security] login attempts cleanup failed:', e);
    }
    try {
      const retentionMs = Math.max(7, SECURITY_EVENTS_RETENTION_DAYS) * 24 * 60 * 60 * 1000;
      const eventsCutoff = new Date(Date.now() - retentionMs).toISOString();
      await db.run('DELETE FROM security_events WHERE created_at < ?', [eventsCutoff]);
    } catch (e) {
      console.error('[security] security events cleanup failed:', e);
    }
    pruneSuspiciousMap();
  }, 60 * 60 * 1000);
}
