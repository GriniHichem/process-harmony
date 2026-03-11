
CREATE TABLE public.process_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text NOT NULL DEFAULT '',
  score_objectifs integer NOT NULL DEFAULT 2,
  score_ca integer NOT NULL DEFAULT 2,
  score_satisfaction integer NOT NULL DEFAULT 2,
  score_perennite integer NOT NULL DEFAULT 2,
  score_risques integer NOT NULL DEFAULT 2,
  score_total integer NOT NULL DEFAULT 10,
  resultat text NOT NULL DEFAULT 'activite',
  statut text NOT NULL DEFAULT 'en_attente',
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.process_evaluations ENABLE ROW LEVEL SECURITY;

-- SELECT for all authenticated
CREATE POLICY "pe_select" ON public.process_evaluations FOR SELECT TO authenticated USING (true);

-- INSERT for admin + rmq + responsable_processus + consultant
CREATE POLICY "pe_insert_admin" ON public.process_evaluations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "pe_insert_rmq" ON public.process_evaluations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "pe_insert_rp" ON public.process_evaluations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "pe_insert_consultant" ON public.process_evaluations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'consultant'::app_role));

-- UPDATE for admin + rmq
CREATE POLICY "pe_update_admin" ON public.process_evaluations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "pe_update_rmq" ON public.process_evaluations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));

-- DELETE for admin + rmq
CREATE POLICY "pe_delete_admin" ON public.process_evaluations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "pe_delete_rmq" ON public.process_evaluations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_process_evaluations_updated_at
  BEFORE UPDATE ON public.process_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
