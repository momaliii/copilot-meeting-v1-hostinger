-- Per-user limit overrides (NULL = use plan default)
ALTER TABLE users ADD COLUMN IF NOT EXISTS language_changes_override INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS video_caption_override INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cloud_save_override INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_analysis_override INTEGER DEFAULT NULL;
