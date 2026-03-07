-- Meeting Copilot Postgres schema (Supabase)
-- Run this against your Supabase Postgres database

-- Users (add cloud_save_enabled for Pro-only opt-in)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT,
  name TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  plan_id TEXT DEFAULT 'starter',
  cloud_save_enabled BOOLEAN DEFAULT false
);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT,
  price INTEGER,
  minutes_limit INTEGER
);

-- Meeting usage: minimal rows for quota enforcement (all plans)
CREATE TABLE IF NOT EXISTS meeting_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  meeting_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_usage_user_date ON meeting_usage(user_id, date);

-- Meetings: full content (transcript + analysis) - Pro + cloud_save_enabled only
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  transcript TEXT,
  analysis_json TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_user_date ON meetings(user_id, date);

-- Meeting shares: token-based public links
CREATE TABLE IF NOT EXISTS meeting_shares (
  token TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  meeting_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  reviewer_id TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback(status, created_at);

-- Admin audit logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

-- Prompt rules
CREATE TABLE IF NOT EXISTS prompt_rules (
  id TEXT PRIMARY KEY,
  rule_text TEXT,
  created_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

-- Seed plans (Pro = $15, 600 min)
INSERT INTO plans (id, name, price, minutes_limit) VALUES
  ('starter', 'Starter', 0, 60),
  ('pro', 'Pro', 15, 600)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  minutes_limit = EXCLUDED.minutes_limit;

-- Default admin is created by initDb() with bcrypt-hashed password
