-- Add attachments support to support_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_messages' AND column_name = 'attachments_json'
  ) THEN
    ALTER TABLE support_messages ADD COLUMN attachments_json TEXT;
  END IF;
END $$;
