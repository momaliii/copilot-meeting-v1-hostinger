-- Announcements: priority (info, warning, success) and schedule (starts_at, ends_at)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'info';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
