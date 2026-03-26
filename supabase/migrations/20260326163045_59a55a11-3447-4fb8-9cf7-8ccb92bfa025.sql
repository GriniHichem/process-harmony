
-- =============================================
-- Survey Templates System
-- =============================================

-- 1. survey_templates
CREATE TABLE IF NOT EXISTS public.survey_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  description text DEFAULT '',
  type text NOT NULL DEFAULT 'satisfaction_client',
  status text NOT NULL DEFAULT 'brouillon',
  is_default boolean NOT NULL DEFAULT false,
  notes_internes text DEFAULT '',
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_templates_code ON public.survey_templates(code);

ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read survey_templates"
  ON public.survey_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/RMQ can insert survey_templates"
  ON public.survey_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

CREATE POLICY "Admin/RMQ can update survey_templates"
  ON public.survey_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

CREATE POLICY "Admin/RMQ can delete survey_templates"
  ON public.survey_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

-- 2. survey_template_sections
CREATE TABLE IF NOT EXISTS public.survey_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.survey_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  code text NOT NULL DEFAULT '',
  description text DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read survey_template_sections"
  ON public.survey_template_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/RMQ can insert survey_template_sections"
  ON public.survey_template_sections FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

CREATE POLICY "Admin/RMQ can update survey_template_sections"
  ON public.survey_template_sections FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

CREATE POLICY "Admin/RMQ can delete survey_template_sections"
  ON public.survey_template_sections FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

-- 3. survey_template_questions
CREATE TABLE IF NOT EXISTS public.survey_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.survey_template_sections(id) ON DELETE CASCADE,
  label text NOT NULL,
  question_type text NOT NULL DEFAULT 'absolute_relative',
  order_index integer NOT NULL DEFAULT 0,
  has_absolute_evaluation boolean NOT NULL DEFAULT true,
  has_competitor_evaluation boolean NOT NULL DEFAULT true,
  has_observation_absolute boolean NOT NULL DEFAULT true,
  has_observation_relative boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT true,
  options jsonb DEFAULT NULL,
  poids numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read survey_template_questions"
  ON public.survey_template_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/RMQ can insert survey_template_questions"
  ON public.survey_template_questions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

CREATE POLICY "Admin/RMQ can update survey_template_questions"
  ON public.survey_template_questions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

CREATE POLICY "Admin/RMQ can delete survey_template_questions"
  ON public.survey_template_questions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

-- 4. Add template columns to client_surveys
ALTER TABLE public.client_surveys
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.survey_templates(id),
  ADD COLUMN IF NOT EXISTS template_version integer,
  ADD COLUMN IF NOT EXISTS template_name text,
  ADD COLUMN IF NOT EXISTS client text,
  ADD COLUMN IF NOT EXISTS process_id uuid REFERENCES public.processes(id),
  ADD COLUMN IF NOT EXISTS survey_date date;

-- 5. survey_answers (dual evaluation)
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.client_surveys(id) ON DELETE CASCADE,
  question_label text NOT NULL,
  section_title text NOT NULL DEFAULT '',
  absolute_rating numeric,
  absolute_observation text DEFAULT '',
  relative_rating numeric,
  relative_observation text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read survey_answers"
  ON public.survey_answers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/RMQ can insert survey_answers"
  ON public.survey_answers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

CREATE POLICY "Admin/RMQ can update survey_answers"
  ON public.survey_answers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

CREATE POLICY "Admin/RMQ can delete survey_answers"
  ON public.survey_answers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq'));

-- 6. Seed default template
DO $$
DECLARE
  v_tpl_id uuid;
  v_sec_a uuid;
  v_sec_b uuid;
  v_sec_c uuid;
BEGIN
  INSERT INTO public.survey_templates (name, code, version, description, type, status, is_default)
  VALUES (
    'Enquête satisfaction client standard',
    'TPL-SAT-001',
    1,
    'Modèle standard ISO 9001 avec double évaluation (absolue et concurrence) couvrant la qualité produits-services, les délais d''exécution et les prix.',
    'satisfaction_client',
    'actif',
    true
  )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO v_tpl_id;

  IF v_tpl_id IS NULL THEN
    RETURN;
  END IF;

  -- Section A
  INSERT INTO public.survey_template_sections (id, template_id, title, code, order_index, description)
  VALUES (gen_random_uuid(), v_tpl_id, 'Thèmes relatifs à la qualité produits-services', 'SEC-A', 0, 'Évaluation de la qualité des produits et services fournis')
  RETURNING id INTO v_sec_a;

  INSERT INTO public.survey_template_questions (section_id, label, question_type, order_index) VALUES
    (v_sec_a, 'Respect des clauses contractuelles', 'absolute_relative', 0),
    (v_sec_a, 'Réactivité face aux réclamations clients', 'absolute_relative', 1),
    (v_sec_a, 'Qualité de notre contrôle au fournisseur (matériel ou incorporable)', 'absolute_relative', 2);

  -- Section B
  INSERT INTO public.survey_template_sections (id, template_id, title, code, order_index, description)
  VALUES (gen_random_uuid(), v_tpl_id, 'Thèmes relatifs aux délais d''exécution – mise à disposition', 'SEC-B', 1, 'Évaluation du respect et de la réactivité sur les délais')
  RETURNING id INTO v_sec_b;

  INSERT INTO public.survey_template_questions (section_id, label, question_type, order_index) VALUES
    (v_sec_b, 'Respect des délais', 'absolute_relative', 0),
    (v_sec_b, 'Réactivité lors d''un contrat urgent', 'absolute_relative', 1),
    (v_sec_b, 'Réactivité pour demande de moyens de réalisation supplémentaires', 'absolute_relative', 2);

  -- Section C
  INSERT INTO public.survey_template_sections (id, template_id, title, code, order_index, description)
  VALUES (gen_random_uuid(), v_tpl_id, 'Thèmes relatifs aux prix d''exécution – mise à disposition', 'SEC-C', 2, 'Évaluation des aspects financiers')
  RETURNING id INTO v_sec_c;

  INSERT INTO public.survey_template_questions (section_id, label, question_type, order_index) VALUES
    (v_sec_c, 'Écart de prix / contrat initial', 'absolute_relative', 0),
    (v_sec_c, 'Rapport qualité / prix', 'absolute_relative', 1),
    (v_sec_c, 'Coût des travaux imprévus', 'absolute_relative', 2);
END;
$$;

-- Updated_at trigger for survey_templates
DROP TRIGGER IF EXISTS update_survey_templates_updated_at ON public.survey_templates;
CREATE TRIGGER update_survey_templates_updated_at
  BEFORE UPDATE ON public.survey_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
