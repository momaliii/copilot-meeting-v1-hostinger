-- Session replay (rrweb) and heatmap data

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  page_url TEXT,
  duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

CREATE TABLE IF NOT EXISTS session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  events_json TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);

CREATE TABLE IF NOT EXISTS heatmap_data (
  id TEXT PRIMARY KEY,
  page_path TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_heatmap_data_page_date ON heatmap_data(page_path, date);

-- User consent for session replay (default off)
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_replay_consent BOOLEAN DEFAULT false;
