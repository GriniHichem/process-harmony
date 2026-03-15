INSERT INTO public.app_settings (key, value) VALUES
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_password', ''),
  ('support_email', ''),
  ('logo_url', ''),
  ('brand_logo_url', '')
ON CONFLICT (key) DO NOTHING;