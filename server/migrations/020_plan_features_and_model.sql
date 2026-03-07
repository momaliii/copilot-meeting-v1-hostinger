-- Add plan features and model selection (admin-configurable)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS video_caption BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS cloud_save BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS pro_analysis_enabled BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS analysis_model TEXT DEFAULT 'gemini-2.5-flash';

-- Backfill existing plans
UPDATE plans SET video_caption = true, cloud_save = true, pro_analysis_enabled = true WHERE id = 'pro_video';
UPDATE plans SET cloud_save = true, pro_analysis_enabled = true WHERE id = 'pro';
UPDATE plans SET video_caption = false, cloud_save = false, pro_analysis_enabled = false WHERE id = 'starter';
