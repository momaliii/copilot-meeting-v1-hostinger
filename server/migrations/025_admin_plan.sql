-- Create explicit admin plan with unlimited values
INSERT INTO plans (id, name, price, minutes_limit, language_changes_limit, video_caption, cloud_save, pro_analysis_enabled, analysis_model, transcript_model)
VALUES ('admin', 'Admin (Unlimited)', 0, 999999, -1, true, true, true, 'gemini-3.1-pro-preview', 'gemini-2.5-flash')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  minutes_limit = EXCLUDED.minutes_limit,
  language_changes_limit = EXCLUDED.language_changes_limit,
  video_caption = EXCLUDED.video_caption,
  cloud_save = EXCLUDED.cloud_save,
  pro_analysis_enabled = EXCLUDED.pro_analysis_enabled,
  analysis_model = EXCLUDED.analysis_model,
  transcript_model = EXCLUDED.transcript_model;

-- Assign admin plan to all admin users
UPDATE users SET plan_id = 'admin' WHERE role = 'admin';
