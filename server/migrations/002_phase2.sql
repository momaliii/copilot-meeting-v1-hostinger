-- Admin Panel Phase 2: extra_minutes_override, force_logout_at, announcements

ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_minutes_override INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_logout_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
