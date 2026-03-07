-- Redirect rules: admin-configured path redirects (from_path -> to_path)
CREATE TABLE IF NOT EXISTS redirect_rules (
  id TEXT PRIMARY KEY,
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redirect_rules_from_path ON redirect_rules(from_path);
CREATE INDEX IF NOT EXISTS idx_redirect_rules_active ON redirect_rules(active);
