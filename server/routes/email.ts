import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { isSmtpConfigured, sendMeetingEmail } from '../email.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email: string): boolean {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

async function getEmailRateLimits(): Promise<{ perMinute: number; perDay: number }> {
  const rows = (await db.query('SELECT key, value FROM site_settings')).rows;
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  const perMinute = Math.min(60, Math.max(1, parseInt(map.smtp_send_rate_limit_per_minute || '5', 10) || 5));
  const perDay = Math.min(200, Math.max(1, parseInt(map.smtp_send_rate_limit_per_day || '20', 10) || 20));
  return { perMinute, perDay };
}

const router = Router();

router.get('/available', (_req, res) => {
  res.json({ available: isSmtpConfigured() });
});

router.post('/send', authenticateToken, async (req: any, res) => {
  try {
    if (!isSmtpConfigured()) {
      return res.status(503).json({ error: 'SMTP not configured' });
    }

    const { to, subject, body } = req.body;
    if (!Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }
    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Subject is required' });
    }
    if (!body || typeof body !== 'string') {
      return res.status(400).json({ error: 'Body is required' });
    }

    const recipients = to
      .map((e: string) => (typeof e === 'string' ? e.trim() : ''))
      .filter(Boolean);
    const invalid = recipients.filter((e: string) => !isValidEmail(e));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid email address(es): ${invalid.join(', ')}` });
    }

    const userId = req.user.id;
    const user = await db.queryOne('SELECT email FROM users WHERE id = ?', [userId]);
    if (!user?.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    const { perMinute, perDay } = await getEmailRateLimits();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const countMinute = (await db.queryOne(
      'SELECT COUNT(*) as count FROM email_send_log WHERE user_id = ? AND created_at >= ?',
      [userId, oneMinuteAgo]
    ))?.count ?? 0;
    const countDay = (await db.queryOne(
      'SELECT COUNT(*) as count FROM email_send_log WHERE user_id = ? AND created_at >= ?',
      [userId, oneDayAgo]
    ))?.count ?? 0;

    if (countMinute >= perMinute) {
      return res.status(429).json({ error: `Rate limit: max ${perMinute} emails per minute. Please try again later.` });
    }
    if (countDay >= perDay) {
      return res.status(429).json({ error: `Rate limit: max ${perDay} emails per day. Please try again tomorrow.` });
    }

    await sendMeetingEmail(recipients, user.email, subject, body);

    const logId = `esl-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    await db.run(
      'INSERT INTO email_send_log (id, user_id, created_at) VALUES (?, ?, ?)',
      [logId, userId, new Date().toISOString()]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Email] Send error:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

export default router;
