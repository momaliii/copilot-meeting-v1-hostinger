CREATE TABLE IF NOT EXISTS email_send_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_send_log_user_created ON email_send_log(user_id, created_at);
