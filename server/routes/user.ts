import { Router } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import db, { USAGE_TABLE, sqlCurrentMonth, sqlDateFilter, sqlDateColumn, isPostgres } from '../db.ts';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.ts';
import { sendVerificationEmail } from '../email.ts';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const uploadsDir = join(process.cwd(), 'uploads/support');
const avatarsDir = join(process.cwd(), 'uploads/avatars');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
if (!existsSync(avatarsDir)) mkdirSync(avatarsDir, { recursive: true });

const extFromMime = (mime: string) => {
  if (mime.startsWith('image/')) return mime === 'image/png' ? '.png' : mime === 'image/gif' ? '.gif' : mime === 'image/webp' ? '.webp' : '.jpg';
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'application/msword') return '.doc';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  if (mime === 'text/plain') return '.txt';
  return '.bin';
};
const allowedMimes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.', 'text/plain'];
const avatarMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => {
      const user = (req as any).user;
      const ext = file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : file.mimetype === 'image/gif' ? '.gif' : '.jpg';
      cb(null, `${user.id}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = avatarMimes.includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  },
});
const supportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extFromMime(file.mimetype)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype === 'application/msword' || file.mimetype.startsWith('application/vnd.openxmlformats-officedocument.') || file.mimetype === 'text/plain';
    if (ok) cb(null, true);
    else cb(new Error('Only images, PDF, Word, and text files are allowed'));
  },
});

const router = Router();

router.use(authenticateToken);

router.get('/preferences', async (req: any, res) => {
  try {
    const user = req.user;
    let row: any;
    try {
      row = await db.queryOne('SELECT cloud_save_enabled, session_replay_consent FROM users WHERE id = ?', [user.id]);
    } catch (_) {
      row = await db.queryOne('SELECT cloud_save_enabled FROM users WHERE id = ?', [user.id]);
      if (row) row.session_replay_consent = false;
    }
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({
      cloudSaveEnabled: !!row.cloud_save_enabled,
      sessionReplayConsent: !!row.session_replay_consent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

router.post('/checkout', async (req: any, res) => {
  try {
    const user = req.user;
    const schema = z.object({
      planId: z.string().min(1),
      promoCode: z.string().max(100).optional(),
    });
    const { planId, promoCode } = schema.parse(req.body);

    const plan = await db.queryOne('SELECT id, price FROM plans WHERE id = ?', [planId]);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    const isPaidPlan = (plan.price ?? 0) > 0;
    if (isPaidPlan && (!promoCode || !promoCode.trim())) {
      return res.status(400).json({ error: 'Promo code is required to upgrade to a paid plan' });
    }

    let finalPlanId = planId;
    let promoRow: any = null;

    if (promoCode && promoCode.trim()) {
      const codeNorm = promoCode.trim().toUpperCase();
      promoRow = await db.queryOne(
        'SELECT id, type, discount_percent, plan_id, plan_months, valid_from, valid_until, max_uses, max_uses_per_user, uses_count, active FROM promo_codes WHERE UPPER(TRIM(code)) = ? AND active = 1',
        [codeNorm]
      );
      if (!promoRow) return res.status(400).json({ error: 'Invalid or expired promo code' });
      const now = new Date().toISOString();
      if (promoRow.valid_from && promoRow.valid_from > now) return res.status(400).json({ error: 'Promo not yet active' });
      if (promoRow.valid_until && promoRow.valid_until < now) return res.status(400).json({ error: 'Promo expired' });
      if (promoRow.max_uses != null && (promoRow.uses_count || 0) >= promoRow.max_uses) return res.status(400).json({ error: 'Promo limit reached' });
      if (promoRow.max_uses_per_user != null) {
        const userUsesRow = await db.queryOne(
          'SELECT COUNT(*) as count FROM promo_code_uses WHERE promo_code_id = ? AND user_id = ?',
          [promoRow.id, user.id]
        );
        const userUses = Math.max(0, parseInt(String(userUsesRow?.count ?? 0), 10));
        if (userUses >= promoRow.max_uses_per_user) return res.status(400).json({ error: 'You have already used this promo code the maximum number of times' });
      }
      if (promoRow.type === 'plan_time') {
        if (promoRow.plan_id !== planId) return res.status(400).json({ error: 'Promo not valid for this plan' });
        finalPlanId = promoRow.plan_id;
      }
    }

    await db.run('UPDATE users SET plan_id = ? WHERE id = ?', [finalPlanId, user.id]);

    if (promoRow) {
      await db.run('UPDATE promo_codes SET uses_count = COALESCE(uses_count, 0) + 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), promoRow.id]);
      const useId = `promo-use-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await db.run('INSERT INTO promo_code_uses (id, promo_code_id, user_id, used_at) VALUES (?, ?, ?, ?)', [useId, promoRow.id, user.id, new Date().toISOString()]);
    }

    res.json({ success: true, planId: finalPlanId });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error(err);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

router.post('/cancel-plan', async (req: any, res) => {
  try {
    const user = req.user;
    const row = await db.queryOne('SELECT role FROM users WHERE id = ?', [user.id]);
    if (!row) return res.status(404).json({ error: 'User not found' });
    if (row.role === 'admin') return res.status(403).json({ error: 'Admins cannot cancel plan' });
    await db.run('UPDATE users SET plan_id = ? WHERE id = ?', ['starter', user.id]);
    try {
      const cloudSaveVal = isPostgres() ? false : 0;
      await db.run('UPDATE users SET cloud_save_enabled = ? WHERE id = ?', [cloudSaveVal, user.id]);
    } catch (_) {
      // cloud_save_enabled may not exist in older schemas; plan_id update is sufficient
    }
    res.json({ success: true, planId: 'starter' });
  } catch (err: any) {
    console.error('Cancel plan error:', err);
    res.status(500).json({ error: err?.message || 'Failed to cancel plan' });
  }
});

router.put('/preferences', async (req: any, res) => {
  try {
    const user = req.user;
    const schema = z.object({
      cloudSaveEnabled: z.boolean().optional(),
      sessionReplayConsent: z.boolean().optional(),
    });
    const body = schema.parse(req.body);
    const row = await db.queryOne('SELECT plan_id, role FROM users WHERE id = ?', [user.id]);
    if (!row) return res.status(404).json({ error: 'User not found' });
    const plan = row.plan_id ? await db.queryOne('SELECT cloud_save FROM plans WHERE id = ?', [row.plan_id]) : null;
    const hasCloudSave = row.role === 'admin' || !!(plan?.cloud_save === true || plan?.cloud_save === 1);
    const updates: { cloudSaveEnabled?: boolean; sessionReplayConsent?: boolean } = {};
    if (body.cloudSaveEnabled !== undefined) {
      if (body.cloudSaveEnabled && !hasCloudSave) {
        return res.status(403).json({ error: 'Cloud save is only available on plans with cloud save' });
      }
      await db.run('UPDATE users SET cloud_save_enabled = ? WHERE id = ?', [body.cloudSaveEnabled ? 1 : 0, user.id]);
      updates.cloudSaveEnabled = body.cloudSaveEnabled;
    }
    if (body.sessionReplayConsent !== undefined) {
      try {
        await db.run('UPDATE users SET session_replay_consent = ? WHERE id = ?', [body.sessionReplayConsent ? 1 : 0, user.id]);
        updates.sessionReplayConsent = body.sessionReplayConsent;
      } catch (_) {
        // Column may not exist in older schemas
      }
    }
    res.json(updates);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error(err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.post('/tour-event', async (req: any, res) => {
  try {
    const user = req.user;
    const schema = z.object({
      eventType: z.enum(['completed', 'skipped']),
      stepIndex: z.number().int().min(0).optional(),
      totalSteps: z.number().int().min(1).optional(),
    });
    const { eventType, stepIndex, totalSteps } = schema.parse(req.body);
    const id = `tour-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await db.run(
      'INSERT INTO tour_events (id, user_id, event_type, step_index, total_steps) VALUES (?, ?, ?, ?, ?)',
      [id, user.id, eventType, stepIndex ?? null, totalSteps ?? null]
    );
    res.status(204).send();
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error(err);
    res.status(500).json({ error: 'Failed to record tour event' });
  }
});

router.get('/usage', async (req: any, res) => {
  try {
    const user = req.user;
    const userRow = await db.queryOne('SELECT plan_id, extra_minutes_override, role FROM users WHERE id = ?', [user.id]);
    if (!userRow) return res.status(404).json({ error: 'User not found' });

    if (userRow.role === 'admin') {
      return res.json({
        usedSeconds: 0,
        limitMinutes: 10000,
        limitSeconds: 600000,
        remainingSeconds: 600000,
        languageChangesLimit: -1,
      });
    }

    const plan = await db.queryOne('SELECT minutes_limit, language_changes_limit FROM plans WHERE id = ?', [userRow.plan_id]);
    const baseLimit = plan ? plan.minutes_limit : 60;
    const extraOverride = Number(userRow.extra_minutes_override ?? 0) || 0;
    const limitMinutes = baseLimit + extraOverride;
    const languageChangesLimit = plan?.language_changes_limit != null ? Number(plan.language_changes_limit) : -1;

    const monthFilter = sqlCurrentMonth('date');
    const usageRow = await db.queryOne(
      `SELECT COALESCE(SUM(duration), 0) as total_seconds FROM ${USAGE_TABLE} WHERE user_id = ? AND ${monthFilter}`,
      [user.id]
    );
    const usedSeconds = Number(usageRow?.total_seconds ?? 0);

    res.json({
      usedSeconds,
      limitMinutes,
      limitSeconds: limitMinutes * 60,
      remainingSeconds: Math.max(0, limitMinutes * 60 - usedSeconds),
      languageChangesLimit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

router.post('/usage', async (req: any, res) => {
  try {
    const user = req.user;
    const usageSchema = z.object({
      id: z.string().min(1).max(100),
      title: z.string().min(1).max(255).optional(),
      durationSeconds: z.number().int().min(0).max(8 * 60 * 60).optional(),
    });
    const { id, title, durationSeconds } = usageSchema.parse(req.body);

    await db.run(
      `INSERT INTO ${USAGE_TABLE} (id, user_id, meeting_id, title, date, duration)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET duration = EXCLUDED.duration`,
      [id, user.id, id, title || 'Meeting', new Date().toISOString(), durationSeconds ?? 0]
    );

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update usage' });
  }
});

router.get('/analytics', async (req: any, res) => {
  try {
    const user = req.user;
    const daysSchema = z.object({
      days: z.coerce.number().int().min(7).max(90).optional(),
    });
    const { days = 14 } = daysSchema.parse(req.query);

    const dateCol = sqlDateColumn('date');
    const dateFilter = sqlDateFilter('date');
    const dailyUsage = (
      await db.query(
        `SELECT ${dateCol} as day, COUNT(*) as meetings, COALESCE(SUM(duration), 0) as seconds
         FROM ${USAGE_TABLE}
         WHERE user_id = ? AND ${dateFilter}
         GROUP BY ${dateCol}
         ORDER BY day ASC`,
        [user.id, days]
      )
    ).rows;

    const summary = await db.queryOne(
      `SELECT COUNT(*) as "totalMeetings", COALESCE(SUM(duration), 0) as "totalSeconds", COALESCE(AVG(duration), 0) as "avgDurationSeconds"
       FROM ${USAGE_TABLE} WHERE user_id = ?`,
      [user.id]
    );

    const recentActivity = (
      await db.query(
        `SELECT id, title, date, duration FROM ${USAGE_TABLE} WHERE user_id = ? ORDER BY date DESC LIMIT 8`,
        [user.id]
      )
    ).rows;

    res.json({
      rangeDays: days,
      summary,
      dailyUsage,
      recentActivity,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/activity', async (req: any, res) => {
  try {
    const user = req.user;
    const items = (
      await db.query(
        `SELECT id, title, date, duration FROM ${USAGE_TABLE} WHERE user_id = ? ORDER BY date DESC LIMIT 25`,
        [user.id]
      )
    ).rows;
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

const profileSchema = z.object({
  name: z.string().max(100).optional(),
});

router.put('/profile', async (req: any, res) => {
  try {
    const user = req.user;
    const { name } = profileSchema.parse(req.body);

    await db.run('UPDATE users SET name = ? WHERE id = ?', [name || '', user.id]);
    const updatedUser = await db.queryOne('SELECT id, email, name, role, status, plan_id, avatar_url FROM users WHERE id = ?', [user.id]);
    res.json({ user: updatedUser });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/avatar', avatarUpload.single('avatar'), async (req: any, res) => {
  try {
    const user = req.user;
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, user.id]);
    const updatedUser = await db.queryOne('SELECT id, email, name, role, status, plan_id, avatar_url FROM users WHERE id = ?', [user.id]);
    res.json({ user: updatedUser });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .max(100),
});

router.put('/password', async (req: any, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);

    const userRow = await db.queryOne('SELECT password as hash FROM users WHERE id = ?', [user.id]);
    if (!userRow) return res.status(404).json({ error: 'User not found' });
    if (!userRow.hash) return res.status(400).json({ error: 'Account configuration error. Please contact support.' });

    let isMatch = false;
    if (String(userRow.hash).startsWith('$2b$')) {
      isMatch = await bcrypt.compare(currentPassword, userRow.hash);
    } else {
      isMatch = currentPassword === userRow.hash;
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

const emailRequestSchema = z.object({
  newEmail: z.string().email('Invalid email address').max(255),
  currentPassword: z.string().min(1, 'Password is required'),
});

router.post('/email/request', async (req: any, res) => {
  try {
    const user = req.user;
    const { newEmail, currentPassword } = emailRequestSchema.parse(req.body);

    if (newEmail.toLowerCase() === (user.email || '').toLowerCase()) {
      return res.status(400).json({ error: 'New email is the same as current email' });
    }

    const existing = await db.queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [newEmail.toLowerCase()]);
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const userRow = await db.queryOne('SELECT password as hash FROM users WHERE id = ?', [user.id]);
    if (!userRow) return res.status(404).json({ error: 'User not found' });
    if (!userRow.hash) return res.status(400).json({ error: 'Account configuration error. Please contact support.' });

    let isMatch = false;
    if (String(userRow.hash).startsWith('$2b$')) {
      isMatch = await bcrypt.compare(currentPassword, userRow.hash);
    } else {
      isMatch = currentPassword === userRow.hash;
    }
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });

    const token = crypto.randomBytes(32).toString('hex');
    const id = Date.now().toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.run(
      'INSERT INTO email_verification_tokens (id, user_id, new_email, token, expires_at) VALUES (?, ?, ?, ?, ?)',
      [id, user.id, newEmail.toLowerCase(), token, expiresAt]
    );

    const baseUrl = process.env.APP_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/dashboard?verifyEmail=${token}`;

    await sendVerificationEmail(newEmail, verificationLink);

    res.json({ success: true, message: 'Verification email sent' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

router.get('/2fa/status', async (req: any, res) => {
  try {
    const user = req.user;
    const row = await db.queryOne('SELECT totp_enabled FROM users WHERE id = ?', [user.id]);
    res.json({ enabled: !!row?.totp_enabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch 2FA status' });
  }
});

router.post('/2fa/enable', async (req: any, res) => {
  try {
    const user = req.user;
    const { rows: existing } = await db.query('SELECT id FROM users WHERE id = ? AND totp_enabled = 1', [user.id]);
    if (existing?.length) return res.status(400).json({ error: '2FA is already enabled' });

    const secret = speakeasy.generateSecret({ name: `Meeting Copilot (${user.email})`, length: 20 });
    await db.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret.base32, user.id]);

    const otpauthUrl = secret.otpauth_url || `otpauth://totp/Meeting%20Copilot:${encodeURIComponent(user.email || '')}?secret=${secret.base32}`;
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({ qrDataUrl, secret: secret.base32 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

const verify2FASetupSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

router.post('/2fa/verify', async (req: any, res) => {
  try {
    const user = req.user;
    const { code } = verify2FASetupSchema.parse(req.body);

    const row = await db.queryOne('SELECT totp_secret FROM users WHERE id = ?', [user.id]);
    if (!row?.totp_secret) return res.status(400).json({ error: '2FA setup not started' });

    const verified = speakeasy.totp.verify({
      secret: row.totp_secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) return res.status(400).json({ error: 'Invalid code' });

    await db.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', [user.id]);

    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g)?.join('-') || ''
    );
    for (const backupCode of backupCodes) {
      const id = crypto.randomBytes(8).toString('hex');
      const hash = await bcrypt.hash(backupCode, 10);
      await db.run('INSERT INTO user_backup_codes (id, user_id, code_hash) VALUES (?, ?, ?)', [id, user.id, hash]);
    }

    res.json({ success: true, backupCodes });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

router.post('/2fa/disable', async (req: any, res) => {
  try {
    const user = req.user;
    const { password } = disable2FASchema.parse(req.body);

    const userRow = await db.queryOne('SELECT password as hash FROM users WHERE id = ?', [user.id]);
    if (!userRow) return res.status(404).json({ error: 'User not found' });
    if (!userRow.hash) return res.status(400).json({ error: 'Account configuration error. Please contact support.' });

    let isMatch = false;
    if (String(userRow.hash).startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, userRow.hash);
    } else {
      isMatch = password === userRow.hash;
    }
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });

    await db.run('UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?', [user.id]);
    await db.run('DELETE FROM user_backup_codes WHERE user_id = ?', [user.id]);

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

router.delete('/account', async (req: any, res) => {
  try {
    const user = req.user;
    const { password } = deleteAccountSchema.parse(req.body);

    const userRow = await db.queryOne('SELECT password as hash FROM users WHERE id = ?', [user.id]);
    if (!userRow) return res.status(404).json({ error: 'User not found' });
    if (!userRow.hash) return res.status(400).json({ error: 'Account configuration error. Please contact support.' });

    let isMatch = false;
    if (String(userRow.hash).startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, userRow.hash);
    } else {
      isMatch = password === userRow.hash;
    }
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });

    await db.run('DELETE FROM user_backup_codes WHERE user_id = ?', [user.id]);
    await db.run('DELETE FROM email_verification_tokens WHERE user_id = ?', [user.id]);
    await db.run('DELETE FROM feedback WHERE user_id = ?', [user.id]);
    await db.run('DELETE FROM support_messages WHERE conversation_id IN (SELECT id FROM support_conversations WHERE user_id = ?)', [user.id]);
    await db.run('DELETE FROM support_conversations WHERE user_id = ?', [user.id]);
    await db.run(`DELETE FROM ${USAGE_TABLE} WHERE user_id = ?`, [user.id]);
    await db.run('DELETE FROM meetings WHERE user_id = ?', [user.id]);
    await db.run('DELETE FROM users WHERE id = ?', [user.id]);

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.post('/feedback', async (req: any, res) => {
  try {
    const user = req.user;
    const feedbackSchema = z.object({
      meetingId: z.string().min(1).max(100),
      rating: z.number().int().min(1).max(5),
      comment: z.string().min(1).max(1000),
      category: z.enum(['summary', 'action_items', 'transcript', 'other']).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
    });
    const { meetingId, rating, comment, category = 'other', priority = 'medium' } = feedbackSchema.parse(req.body);

    await db.run(
      `INSERT INTO feedback (id, user_id, meeting_id, rating, comment, status, created_at, category, priority, review_notes)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, '')`,
      [Date.now().toString(), user.id, meetingId, rating, comment, new Date().toISOString(), category, priority]
    );

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

router.get('/prompt-rules', async (req: any, res) => {
  try {
    const rules = (await db.query('SELECT rule_text FROM prompt_rules ORDER BY created_at DESC')).rows;
    res.json(rules.map((r: any) => r.rule_text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch prompt rules' });
  }
});

// Support chat - image/file upload
router.post('/support/upload', supportUpload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const url = `/uploads/support/${req.file.filename}`;
    res.json({ url, filename: req.file.originalname });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

router.get('/support/conversation', async (req: any, res) => {
  try {
    const userId = req.user.id;
    let conv = await db.queryOne('SELECT id FROM support_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
    if (!conv) {
      const id = Date.now().toString();
      await db.run('INSERT INTO support_conversations (id, user_id) VALUES (?, ?)', [id, userId]);
      conv = { id };
    }
    const rows = (await db.query(
      'SELECT id, sender_type, sender_id, content, attachments_json, created_at FROM support_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conv.id]
    )).rows;
    const messages = rows.map((r: any) => {
      let attachments: string[] = [];
      try { attachments = r.attachments_json ? JSON.parse(r.attachments_json) : []; } catch (_) {}
      return { ...r, attachments };
    });
    res.json({ id: conv.id, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

const supportMessageSchema = z.object({
  content: z.string().max(5000).optional(),
  attachments: z.array(z.string().min(1).max(500)).max(10).optional(),
}).refine((d) => (d.content?.trim()?.length ?? 0) > 0 || (d.attachments?.length ?? 0) > 0, { message: 'Message must have content or attachments' });

router.post('/support/messages', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { content = '', attachments } = supportMessageSchema.parse(req.body);
    const contentStr = (content || '').trim() || ' ';
    let conv = await db.queryOne('SELECT id FROM support_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
    if (!conv) {
      const id = Date.now().toString();
      await db.run('INSERT INTO support_conversations (id, user_id) VALUES (?, ?)', [id, userId]);
      conv = { id };
    }
    const msgId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const attachmentsJson = attachments?.length ? JSON.stringify(attachments) : null;
    await db.run(
      'INSERT INTO support_messages (id, conversation_id, sender_type, sender_id, content, attachments_json) VALUES (?, ?, ?, ?, ?, ?)',
      [msgId, conv.id, 'user', userId, contentStr, attachmentsJson]
    );
    await db.run('UPDATE support_conversations SET updated_at = ? WHERE id = ?', [new Date().toISOString(), conv.id]);
    const msg = { id: msgId, sender_type: 'user', sender_id: userId, content: contentStr, attachments: attachments || [], created_at: new Date().toISOString() };
    const io = req.app.get('io');
    if (io) io.to(`conversation:${conv.id}`).emit('new_message', msg);
    res.json({ id: msgId, message: msg });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
