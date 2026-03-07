-- Support: admin notes and tags
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS tags TEXT;
