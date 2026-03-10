
-- Table pour les actions liées aux risques/opportunités
CREATE TABLE public.risk_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES public.risks_opportunities(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'a_faire',
  date_prevue DATE NULL,
  deadline DATE NULL,
  responsable TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_actions_select" ON public.risk_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_actions_insert" ON public.risk_actions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "risk_actions_insert_admin" ON public.risk_actions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "risk_actions_update" ON public.risk_actions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "risk_actions_update_admin" ON public.risk_actions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "risk_actions_delete" ON public.risk_actions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "risk_actions_delete_admin" ON public.risk_actions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Table pour les moyens liés aux risques/opportunités
CREATE TABLE public.risk_moyens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES public.risks_opportunities(id) ON DELETE CASCADE,
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

ALTER TABLE public.risk_moyens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_moyens_select" ON public.risk_moyens FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_moyens_insert" ON public.risk_moyens FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "risk_moyens_insert_admin" ON public.risk_moyens FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "risk_moyens_update" ON public.risk_moyens FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "risk_moyens_update_admin" ON public.risk_moyens FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "risk_moyens_delete" ON public.risk_moyens FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "risk_moyens_delete_admin" ON public.risk_moyens FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
