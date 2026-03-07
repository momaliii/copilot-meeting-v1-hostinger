-- Add transcript_model to plans (configurable per plan for two-step flow)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS transcript_model TEXT DEFAULT 'gemini-2.5-flash';

-- Backfill: all existing plans use Flash for transcript
UPDATE plans SET transcript_model = 'gemini-2.5-flash' WHERE transcript_model IS NULL;
