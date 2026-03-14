import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import db from '../db.ts';

const planRateLimits: Record<string, { windowMs: number; max: number }> = {
  starter:   { windowMs: 15 * 60 * 1000, max: 15 },
  pro:       { windowMs: 15 * 60 * 1000, max: 60 },
  pro_video: { windowMs: 15 * 60 * 1000, max: 60 },
  admin:     { windowMs: 15 * 60 * 1000, max: 200 },
};

const defaultLimit = { windowMs: 15 * 60 * 1000, max: 15 };

function createLimiter(planId: string) {
  const config = planRateLimits[planId] || defaultLimit;
  return rateLimit({
    ...config,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: `AI rate limit reached for your plan. ${planId === 'starter' ? 'Upgrade to Pro for higher limits.' : 'Please try again later.'}`,
    },
    keyGenerator: (req: any) => {
      if (req.user?.id) return req.user.id;
      return ipKeyGenerator(req.ip);
    },
  });
}

const limiters: Record<string, ReturnType<typeof rateLimit>> = {
  starter: createLimiter('starter'),
  pro: createLimiter('pro'),
  pro_video: createLimiter('pro_video'),
  admin: createLimiter('admin'),
};

export async function planAiRateLimiter(req: any, res: any, next: any) {
  try {
    if (!req.user?.id) {
      return limiters.starter(req, res, next);
    }
    const row = await db.queryOne('SELECT plan_id FROM users WHERE id = ?', [req.user.id]);
    const planId = row?.plan_id || 'starter';
    const limiter = limiters[planId] || limiters.starter;
    return limiter(req, res, next);
  } catch (_) {
    return limiters.starter(req, res, next);
  }
}
