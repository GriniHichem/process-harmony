-- Create app_settings table for branding
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "app_settings_insert_sa" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "app_settings_update_sa" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "app_settings_delete_sa" ON public.app_settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('app_name', 'Q-Process'),
  ('company_name', 'Groupe AMOUR'),
  ('app_version', 'v1.01'),
  ('app_description', 'Système intégré ISO 9001 et gestion par processus'),
  ('info_copyright', '© 2026 Groupe AMOUR. Tous droits réservés.'),
  ('info_credits', 'H. GRINI & F. SERRADJ — SI TEAM'),
  ('logo_url', '');

INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "branding_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'branding');

CREATE POLICY "branding_insert_sa" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "branding_update_sa" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "branding_delete_sa" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'super_admin'));