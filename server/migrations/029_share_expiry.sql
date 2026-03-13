ALTER TABLE meeting_shares ADD COLUMN IF NOT EXISTS expires_at TEXT;
ALTER TABLE meeting_shares ADD COLUMN IF NOT EXISTS created_by TEXT;
