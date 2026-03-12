import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import db from '../db.ts';

// ---------------------------------------------------------------------------
// In-memory IP blocklist (loaded from DB on startup, synced on changes)
// ---------------------------------------------------------------------------
const blockedIPs = new Set<string>();

export async function loadBlockedIPs(): Promise<void> {
  try {
    const { rows } = await db.query('SELECT ip FROM blocked_ips');
    blockedIPs.clear();
    rows.forEach((r: any) => blockedIPs.add(r.ip));
  } catch (_) {}
}

export async function blockIP(ip: string, reason: string, blockedBy: string): Promise<void> {
  blockedIPs.add(ip);
  try {
    await db.run(
      'INSERT INTO blocked_ips (ip, reason, blocked_by) VALUES (?, ?, ?)',
      [ip, reason, blockedBy]
    );
    await logSecurityEvent('ip_blocked', ip, null, '/admin', `Blocked by ${blockedBy}: ${reason}`);
  } catch (_) {}
}

export async function unblockIP(ip: string): Promise<void> {
  blockedIPs.delete(ip);
  try {
    await db.run('DELETE FROM blocked_ips WHERE ip = ?', [ip]);
  } catch (_) {}
}

export function isIPBlocked(ip: string): boolean {
  return blockedIPs.has(ip);
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
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Account lockout helpers
// ---------------------------------------------------------------------------
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

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
  } catch (_) {}
}

export async function clearFailedAttempts(email: string): Promise<void> {
  try {
    await db.run(
      'DELETE FROM login_attempts WHERE email = ? AND success = 0',
      [email.toLowerCase()]
    );
  } catch (_) {}
}

export async function isAccountLocked(email: string, ip: string): Promise<{ locked: boolean; remainingMs: number }> {
  try {
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS).toISOString();
    const row = await db.queryOne(
      'SELECT COUNT(*) as count, MAX(created_at) as last_attempt FROM login_attempts WHERE email = ? AND success = 0 AND created_at >= ?',
      [email.toLowerCase(), windowStart]
    );
    const failCount = Number(row?.count ?? 0);
    if (failCount >= MAX_FAILED_ATTEMPTS) {
      const lastAttempt = row?.last_attempt ? new Date(row.last_attempt).getTime() : Date.now();
      const lockExpires = lastAttempt + LOCKOUT_DURATION_MS;
      const remaining = lockExpires - Date.now();
      if (remaining > 0) {
        return { locked: true, remainingMs: remaining };
      }
      await clearFailedAttempts(email);
    }
    return { locked: false, remainingMs: 0 };
  } catch (_) {
    return { locked: false, remainingMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Suspicious pattern detection
// ---------------------------------------------------------------------------
const SQL_INJECTION_RE = /(\b(union\s+(all\s+)?select|select\s+.*from|insert\s+into|update\s+.*set|delete\s+from|drop\s+(table|database)|alter\s+table|exec(\s+|\()|execute\s|xp_|sp_)\b|'(\s|%20)*(or|and)(\s|%20)*('|1\s*=\s*1)|--\s|;\s*(drop|delete|update|insert)\b)/i;
const PATH_TRAVERSAL_RE = /(\.\.(\/|\\|%2f|%5c))|(%2e%2e(\/|\\|%2f|%5c))/i;
const XSS_RE = /(<\s*script[\s>]|javascript\s*:|on(error|load|click|mouse|focus|blur)\s*=|<\s*iframe[\s>]|<\s*object[\s>]|<\s*embed[\s>]|<\s*svg[\s>].*on\w+\s*=)/i;

type ThreatType = 'sql_injection' | 'path_traversal' | 'xss' | null;

function detectThreat(value: string): ThreatType {
  if (SQL_INJECTION_RE.test(value)) return 'sql_injection';
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
// Client IP extraction
// ---------------------------------------------------------------------------
export function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

// ---------------------------------------------------------------------------
// Express middleware: IP block check + suspicious pattern detection
// ---------------------------------------------------------------------------
const SKIP_SCAN_PATHS = ['/api/analyze', '/api/translate', '/api/meetings', '/api/sessions'];

export function securityGuard(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);

  if (isIPBlocked(ip)) {
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
        logSecurityEvent(
          'suspicious_pattern',
          ip,
          (req as any).user?.id || null,
          req.path,
          `${threat}: ${val.slice(0, 200)}`
        );
        res.status(400).json({ error: 'Malicious request detected.' });
        return;
      }
    }
  }

  next();
}

// ---------------------------------------------------------------------------
// Periodic cleanup of old login attempts (run every hour)
// ---------------------------------------------------------------------------
export function startSecurityCleanup(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await db.run('DELETE FROM login_attempts WHERE created_at < ?', [cutoff]);
    } catch (_) {}
  }, 60 * 60 * 1000);
}
