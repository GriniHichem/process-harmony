
-- Table structurée pour les moyens d'un indicateur
CREATE TABLE public.indicator_moyens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  type_moyen TEXT NOT NULL DEFAULT 'humain',
  budget NUMERIC NULL,
  date_prevue DATE NULL,
  deadline DATE NULL,
  responsable TEXT NULL,
  statut TEXT NOT NULL DEFAULT 'a_faire',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.indicator_moyens ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "indicator_moyens_select" ON public.indicator_moyens FOR SELECT TO authenticated USING (true);
CREATE POLICY "indicator_moyens_insert" ON public.indicator_moyens FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "indicator_moyens_insert_admin" ON public.indicator_moyens FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "indicator_moyens_update" ON public.indicator_moyens FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "indicator_moyens_update_admin" ON public.indicator_moyens FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "indicator_moyens_delete" ON public.indicator_moyens FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "indicator_moyens_delete_admin" ON public.indicator_moyens FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
