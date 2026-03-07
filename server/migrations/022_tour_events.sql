-- Tour events for A/B testing and completion/skip rate tracking
CREATE TABLE IF NOT EXISTS tour_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  step_index INTEGER,
  total_steps INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_events_user_created ON tour_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tour_events_type ON tour_events(event_type);
