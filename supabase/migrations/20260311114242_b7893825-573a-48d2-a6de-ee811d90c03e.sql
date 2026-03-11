
-- Tables 1-4 (from failed first migration)

-- 1. quality_policy (Clause 5.2)
CREATE TABLE public.quality_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL DEFAULT '',
  contenu text NOT NULL DEFAULT '',
  objectifs text NOT NULL DEFAULT '',
  date_approbation date,
  approuve_par uuid,
  version integer NOT NULL DEFAULT 1,
  statut text NOT NULL DEFAULT 'brouillon',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quality_policy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qp_select" ON public.quality_policy FOR SELECT TO authenticated USING (true);
CREATE POLICY "qp_insert_rmq" ON public.quality_policy FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "qp_insert_admin" ON public.quality_policy FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qp_update_rmq" ON public.quality_policy FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "qp_update_admin" ON public.quality_policy FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qp_delete_admin" ON public.quality_policy FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. quality_objectives (Clause 5.2)
CREATE TABLE public.quality_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  indicateur text NOT NULL DEFAULT '',
  cible text NOT NULL DEFAULT '',
  echeance date,
  responsable_id uuid,
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  statut text NOT NULL DEFAULT 'en_cours',
  commentaire text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quality_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qo_select" ON public.quality_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "qo_insert_rmq" ON public.quality_objectives FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "qo_insert_admin" ON public.quality_objectives FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qo_update_rmq" ON public.quality_objectives FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "qo_update_admin" ON public.quality_objectives FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qo_delete_admin" ON public.quality_objectives FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. competences (Clause 7.2)
CREATE TABLE public.competences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id uuid NOT NULL REFERENCES public.acteurs(id) ON DELETE CASCADE,
  competence text NOT NULL DEFAULT '',
  niveau text NOT NULL DEFAULT 'debutant',
  date_evaluation date NOT NULL DEFAULT CURRENT_DATE,
  prochaine_evaluation date,
  commentaire text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.competences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_select" ON public.competences FOR SELECT TO authenticated USING (true);
CREATE POLICY "comp_insert_rmq" ON public.competences FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "comp_insert_admin" ON public.competences FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "comp_update_rmq" ON public.competences FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "comp_update_admin" ON public.competences FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "comp_delete_admin" ON public.competences FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. formations (Clause 7.2)
CREATE TABLE public.formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  acteur_id uuid NOT NULL REFERENCES public.acteurs(id) ON DELETE CASCADE,
  date_formation date NOT NULL DEFAULT CURRENT_DATE,
  formateur text NOT NULL DEFAULT '',
  duree_heures numeric NOT NULL DEFAULT 0,
  efficacite text NOT NULL DEFAULT 'non_evaluee',
  preuve text,
  commentaire text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_select" ON public.formations FOR SELECT TO authenticated USING (true);
CREATE POLICY "form_insert_rmq" ON public.formations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "form_insert_admin" ON public.formations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "form_update_rmq" ON public.formations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "form_update_admin" ON public.formations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "form_delete_admin" ON public.formations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Triggers
CREATE TRIGGER update_quality_policy_updated_at BEFORE UPDATE ON public.quality_policy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quality_objectives_updated_at BEFORE UPDATE ON public.quality_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_competences_updated_at BEFORE UPDATE ON public.competences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_formations_updated_at BEFORE UPDATE ON public.formations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
