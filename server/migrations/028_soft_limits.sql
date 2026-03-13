-- Soft vs hard limit percentages per plan
ALTER TABLE plans ADD COLUMN IF NOT EXISTS soft_limit_percent INTEGER DEFAULT 100;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS hard_limit_percent INTEGER DEFAULT 100;
