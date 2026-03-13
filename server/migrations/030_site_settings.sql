CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO site_settings (key, value) VALUES ('site_name', 'Meeting Copilot') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('site_description', 'Record, transcribe, and analyze meetings with AI') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('theme_color', '#4f46e5') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('logo_url', NULL) ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('favicon_url', NULL) ON CONFLICT (key) DO NOTHING;
