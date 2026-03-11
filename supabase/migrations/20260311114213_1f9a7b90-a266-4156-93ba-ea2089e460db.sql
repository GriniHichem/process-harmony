
-- 5. satisfaction_surveys (Clause 9.1.2)
CREATE TABLE public.satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  titre text NOT NULL DEFAULT '',
  date_enquete date NOT NULL DEFAULT CURRENT_DATE,
  type_enquete text NOT NULL DEFAULT 'questionnaire',
  score_global numeric,
  nombre_reponses integer NOT NULL DEFAULT 0,
  analyse_resultats text NOT NULL DEFAULT '',
  actions_prevues text NOT NULL DEFAULT '',
  responsable_id uuid,
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  statut text NOT NULL DEFAULT 'planifiee',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ss_select" ON public.satisfaction_surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "ss_insert_rmq" ON public.satisfaction_surveys FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "ss_insert_admin" ON public.satisfaction_surveys FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ss_update_rmq" ON public.satisfaction_surveys FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "ss_update_admin" ON public.satisfaction_surveys FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ss_delete_admin" ON public.satisfaction_surveys FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. suppliers (Clause 8.4)
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  nom text NOT NULL DEFAULT '',
  type_prestataire text NOT NULL DEFAULT 'fournisseur',
  domaine text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  email text,
  telephone text,
  statut text NOT NULL DEFAULT 'actif',
  date_evaluation date,
  score_evaluation numeric,
  criteres_evaluation text NOT NULL DEFAULT '',
  commentaire text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sup_select" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "sup_insert_rmq" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "sup_insert_admin" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sup_update_rmq" ON public.suppliers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "sup_update_admin" ON public.suppliers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sup_delete_admin" ON public.suppliers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. management_reviews (Clause 9.3)
CREATE TABLE public.management_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  date_revue date NOT NULL DEFAULT CURRENT_DATE,
  participants text NOT NULL DEFAULT '',
  elements_entree text NOT NULL DEFAULT '',
  decisions text NOT NULL DEFAULT '',
  actions_decidees text NOT NULL DEFAULT '',
  responsable_id uuid,
  statut text NOT NULL DEFAULT 'planifiee',
  compte_rendu text NOT NULL DEFAULT '',
  prochaine_revue date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.management_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mr_select" ON public.management_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "mr_insert_rmq" ON public.management_reviews FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "mr_insert_admin" ON public.management_reviews FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "mr_update_rmq" ON public.management_reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "mr_update_admin" ON public.management_reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "mr_delete_admin" ON public.management_reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Triggers updated_at for remaining tables
CREATE TRIGGER update_satisfaction_surveys_updated_at BEFORE UPDATE ON public.satisfaction_surveys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_management_reviews_updated_at BEFORE UPDATE ON public.management_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
