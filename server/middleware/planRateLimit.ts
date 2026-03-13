import rateLimit from 'express-rate-limit';
import db from '../db.ts';

const planRateLimits: Record<string, { windowMs: number; max: number }> = {
  starter:   { windowMs: 15 * 60 * 1000, max: 15 },
  pro:       { windowMs: 15 * 60 * 1000, max: 60 },
  pro_video: { windowMs: 15 * 60 * 1000, max: 60 },
  admin:     { windowMs: 15 * 60 * 1000, max: 200 },
};

const defaultLimit = { windowMs: 15 * 60 * 1000, max: 15 };

const limiterCache = new Map<string, ReturnType<typeof rateLimit>>();

function getLimiterForPlan(planId: string): ReturnType<typeof rateLimit> {
  if (limiterCache.has(planId)) return limiterCache.get(planId)!;
  const config = planRateLimits[planId] || defaultLimit;
  const limiter = rateLimit({
    ...config,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: `AI rate limit reached for your plan. ${planId === 'starter' ? 'Upgrade to Pro for higher limits.' : 'Please try again later.'}`,
    },
    keyGenerator: (req: any) => req.user?.id || req.ip,
  });
  limiterCache.set(planId, limiter);
  return limiter;
}

export async function planAiRateLimiter(req: any, res: any, next: any) {
  try {
    if (!req.user?.id) {
      return getLimiterForPlan('starter')(req, res, next);
    }
    const row = await db.queryOne('SELECT plan_id FROM users WHERE id = ?', [req.user.id]);
    const planId = row?.plan_id || 'starter';
    return getLimiterForPlan(planId)(req, res, next);
  } catch (_) {
    return getLimiterForPlan('starter')(req, res, next);
  }
}
