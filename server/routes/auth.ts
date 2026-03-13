import { Router } from 'express';
import db from '../db.ts';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { JWT_SECRET } from '../middleware/auth.ts';
import { getAdminPermissions } from '../permissions.ts';
import { isAccountLocked, recordLoginAttempt, logSecurityEvent, getClientIP } from '../middleware/security.ts';
import { getUserEffectivePlan } from '../utils/planLimits.ts';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per `window` (here, per 15 minutes)
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 signup requests per `window`
  message: { error: 'Too many accounts created from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .max(100),
  name: z.string().max(100).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  whereKnowUs: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(100),
});

const defaultPlanFeatures = { video_caption: false, cloud_save: false, pro_analysis_enabled: false };

async function enrichUserWithPlanFeatures(user: any): Promise<any> {
  if (!user) return user;
  try {
    const effective = await getUserEffectivePlan(user.id);
    if (!effective) return { ...user, plan_features: defaultPlanFeatures };
    return {
      ...user,
      plan_features: {
        video_caption: effective.hasVideoCaption,
        cloud_save: effective.hasCloudSave,
        pro_analysis_enabled: effective.hasProAnalysis,
      },
    };
  } catch (e) {
    console.error('[auth] enrichUserWithPlanFeatures failed (migrations may be missing):', e);
    return { ...user, plan_features: defaultPlanFeatures };
  }
}

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const ip = getClientIP(req);

    const lockStatus = await isAccountLocked(email, ip);
    if (lockStatus.locked) {
      const minutes = Math.ceil(lockStatus.remainingMs / 60000);
      await logSecurityEvent('account_locked', ip, null, '/api/auth/login', `Locked account login attempt: ${email}`);
      return res.status(429).json({ error: `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` });
    }

    const user = await db.queryOne(
      'SELECT id, email, password as hash, name, role, status, plan_id FROM users WHERE email = ?',
      [email]
    );

    if (user) {
      const hash = user.hash ?? (user as any).password;
      if (!hash) {
        console.error('[auth] User has no password hash:', user.id);
        return res.status(500).json({ error: 'Account configuration error. Please contact support.' });
      }
      let isMatch = false;
      if (!String(hash).startsWith('$2b$')) {
        return res.status(500).json({ error: 'Account requires password reset. Please contact support.' });
      }
      isMatch = await bcrypt.compare(password, hash);

      if (isMatch) {
        if (user.status === 'banned') {
          return res.status(403).json({ error: 'Account is banned' });
        }

        await recordLoginAttempt(email, ip, true);

        try {
          await db.run('UPDATE users SET force_logout_at = NULL WHERE id = ?', [user.id]);
        } catch (_) {}

        const totpEnabled = (user as any).totp_enabled === true || (user as any).totp_enabled === 1;
        if (totpEnabled) {
          const tempToken = jwt.sign({ id: user.id, type: '2fa' }, JWT_SECRET, { expiresIn: '5m' });
          const { hash, totp_enabled, ...userWithoutSensitive } = user;
          return res.json({
            requires2FA: true,
            tempToken,
            user: userWithoutSensitive,
          });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        const { hash, totp_enabled, ...userWithoutHash } = user;
        const userWithFeatures = await enrichUserWithPlanFeatures(userWithoutHash);
        return res.json({
          user: userWithFeatures,
          token,
          permissions: user.role === 'admin' ? getAdminPermissions(user.id) : null,
        });
      }
    }

    await recordLoginAttempt(email, ip, false);
    await logSecurityEvent('failed_login', ip, null, '/api/auth/login', `Failed login: ${email}`);
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error('[auth] POST /login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { email, password, name, firstName, lastName, phone, whereKnowUs } = authSchema.parse(req.body);
    const displayName = name || [firstName || '', lastName || ''].filter(Boolean).join(' ').trim() || email.split('@')[0];
    
    const id = Date.now().toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      await db.run(
        'INSERT INTO users (id, email, password, name, role, first_name, last_name, phone, where_know_us) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, email, hashedPassword, displayName, 'user', firstName || '', lastName || '', phone || '', whereKnowUs || '']
      );
    } catch (insertErr: any) {
      if (insertErr.code === 'SQLITE_ERROR' && insertErr.message?.includes('no such column')) {
        await db.run('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)', [id, email, hashedPassword, displayName, 'user']);
      } else {
        throw insertErr;
      }
    }

    const user = await db.queryOne('SELECT id, email, name, role, status, plan_id, avatar_url FROM users WHERE id = ?', [id]);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const userWithFeatures = await enrichUserWithPlanFeatures(user);
    res.json({
      user: userWithFeatures,
      token,
      permissions: user.role === 'admin' ? getAdminPermissions(user.id) : null,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    } else {
      return res.status(500).json({ error: 'Server error' });
    }
  }
});

router.get('/confirm-email', async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const row = await db.queryOne(
      'SELECT id, user_id, new_email, expires_at FROM email_verification_tokens WHERE token = ?',
      [token]
    );
    if (!row) return res.status(400).json({ error: 'Invalid or expired token' });

    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) {
      await db.run('DELETE FROM email_verification_tokens WHERE token = ?', [token]);
      return res.status(400).json({ error: 'Verification link has expired' });
    }

    const existing = await db.queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [row.new_email.toLowerCase()]);
    if (existing && existing.id !== row.user_id) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    await db.run('UPDATE users SET email = ? WHERE id = ?', [row.new_email, row.user_id]);
    await db.run('DELETE FROM email_verification_tokens WHERE token = ?', [token]);
    await db.run('UPDATE users SET force_logout_at = ? WHERE id = ?', [new Date().toISOString(), row.user_id]);

    res.json({ success: true, newEmail: row.new_email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm email' });
  }
});

const verify2FASchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().length(6, 'Code must be 6 digits'),
});

router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = verify2FASchema.parse(req.body);
    const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
    if (decoded.type !== '2fa') return res.status(400).json({ error: 'Invalid token' });

    const user = await db.queryOne('SELECT id, email, name, role, status, plan_id, avatar_url, totp_secret FROM users WHERE id = ?', [decoded.id]);
    if (!user || !user.totp_secret) return res.status(400).json({ error: 'Invalid token' });

    const speakeasy = await import('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (verified) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const { totp_secret, ...userWithoutSecret } = user;
      const userWithFeatures = await enrichUserWithPlanFeatures(userWithoutSecret);
      return res.json({
        user: userWithFeatures,
        token,
        permissions: user.role === 'admin' ? getAdminPermissions(user.id) : null,
      });
    }

    const { rows: backupRows } = await db.query(
      'SELECT id, code_hash FROM user_backup_codes WHERE user_id = ? AND used_at IS NULL',
      [user.id]
    );
    for (const row of backupRows || []) {
      const match = await bcrypt.compare(code, row.code_hash);
      if (match) {
        await db.run('UPDATE user_backup_codes SET used_at = ? WHERE id = ?', [new Date().toISOString(), row.id]);
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        const { totp_secret, ...userWithoutSecret } = user;
        const userWithFeatures = await enrichUserWithPlanFeatures(userWithoutSecret);
        return res.json({
          user: userWithFeatures,
          token,
          permissions: user.role === 'admin' ? getAdminPermissions(user.id) : null,
        });
      }
    }

    res.status(401).json({ error: 'Invalid code' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    res.status(401).json({ error: 'Invalid code' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // Base columns only so /me works before optional migrations (e.g. avatar_url)
    const user = await db.queryOne('SELECT id, email, name, role, status, plan_id FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'banned') return res.status(403).json({ error: 'Account is banned' });
    const userWithFeatures = await enrichUserWithPlanFeatures(user);
    res.json({
      user: userWithFeatures,
      permissions: user.role === 'admin' ? getAdminPermissions(user.id) : null,
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
