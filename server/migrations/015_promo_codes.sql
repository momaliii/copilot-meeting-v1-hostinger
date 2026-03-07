-- Promo codes: discount or plan-for-time
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('discount', 'plan_time')),
  discount_percent INTEGER,
  plan_id TEXT REFERENCES plans(id),
  plan_months INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_uses INTEGER DEFAULT NULL,
  uses_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active);
