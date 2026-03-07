-- Pro Video plan: video caption/analysis available only in this plan and for admins
INSERT INTO plans (id, name, price, minutes_limit, language_changes_limit) VALUES
  ('pro_video', 'Pro Video', 29, 600, -1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  minutes_limit = EXCLUDED.minutes_limit,
  language_changes_limit = EXCLUDED.language_changes_limit;
