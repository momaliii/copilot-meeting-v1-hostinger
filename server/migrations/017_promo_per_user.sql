-- Per-user promo code limit
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER DEFAULT NULL;

CREATE TABLE IF NOT EXISTS promo_code_uses (
  id TEXT PRIMARY KEY,
  promo_code_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo_user ON promo_code_uses(promo_code_id, user_id);
