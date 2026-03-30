
-- ===== document_types =====
CREATE TABLE IF NOT EXISTS public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read document_types" ON public.document_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/RMQ can manage document_types" ON public.document_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

-- Seed existing enum values
INSERT INTO public.document_types (label, code) VALUES
  ('Procédure', 'procedure'),
  ('Instruction', 'instruction'),
  ('Formulaire', 'formulaire'),
  ('Enregistrement', 'enregistrement'),
  ('Rapport', 'rapport'),
  ('Compte-rendu d''audit', 'compte_rendu_audit'),
  ('Preuve', 'preuve'),
  ('Image', 'image')
ON CONFLICT (code) DO NOTHING;

-- ===== document_tags =====
CREATE TABLE IF NOT EXISTS public.document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read document_tags" ON public.document_tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/RMQ can manage document_tags" ON public.document_tags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

-- Seed default tags
INSERT INTO public.document_tags (label, color) VALUES
  ('Technique', '#3b82f6'),
  ('Graphique', '#8b5cf6'),
  ('Juridique', '#ef4444')
ON CONFLICT (label) DO NOTHING;

-- ===== document_tag_links =====
CREATE TABLE IF NOT EXISTS public.document_tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.document_tags(id) ON DELETE CASCADE,
  UNIQUE(document_id, tag_id)
);
ALTER TABLE public.document_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read document_tag_links" ON public.document_tag_links
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/RMQ can manage document_tag_links" ON public.document_tag_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

-- ===== document_actor_permissions =====
CREATE TABLE IF NOT EXISTS public.document_actor_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id UUID NOT NULL REFERENCES public.acteurs(id) ON DELETE CASCADE,
  can_read BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  allowed_type_ids UUID[] DEFAULT '{}',
  allowed_tag_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(acteur_id)
);
ALTER TABLE public.document_actor_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read document_actor_permissions" ON public.document_actor_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/RMQ can manage document_actor_permissions" ON public.document_actor_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));
