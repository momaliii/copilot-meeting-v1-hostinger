-- Announcements: control which pages show each announcement (public, user_app, admin_app)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS show_on TEXT DEFAULT 'public,user_app,admin_app';
