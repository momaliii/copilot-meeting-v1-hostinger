-- Scheduled meetings table for Google Meet integration
CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  meet_link TEXT,
  google_event_id TEXT,
  attendees TEXT DEFAULT '[]',
  bot_status TEXT DEFAULT 'none',
  bot_meeting_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_user ON scheduled_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_start ON scheduled_meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_bot ON scheduled_meetings(bot_status);
