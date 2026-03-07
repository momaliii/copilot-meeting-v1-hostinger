-- Support chat: conversations and messages

CREATE TABLE IF NOT EXISTS support_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES support_conversations(id),
  sender_type TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_conv_user ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_msg_conv ON support_messages(conversation_id);
