-- Add assigned_to to support_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_conversations' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE support_conversations ADD COLUMN assigned_to TEXT REFERENCES users(id);
  END IF;
END $$;
