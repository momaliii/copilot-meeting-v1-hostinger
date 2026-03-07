-- Add language_changes_limit to plans (-1 = unlimited)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS language_changes_limit INTEGER DEFAULT -1;

-- Seed: Starter = 2, Pro = unlimited (-1)
UPDATE plans SET language_changes_limit = 2 WHERE id = 'starter';
UPDATE plans SET language_changes_limit = -1 WHERE id = 'pro';
