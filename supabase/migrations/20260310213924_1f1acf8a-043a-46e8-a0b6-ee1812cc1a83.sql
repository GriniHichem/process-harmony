
CREATE TABLE public.risk_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID REFERENCES public.risks_opportunities(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  date_incident DATE NOT NULL DEFAULT CURRENT_DATE,
  gravite TEXT NOT NULL DEFAULT 'mineure',
  statut TEXT NOT NULL DEFAULT 'ouvert',
  responsable TEXT NULL,
  actions_correctives TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_incidents_select" ON public.risk_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_incidents_insert" ON public.risk_incidents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "risk_incidents_insert_admin" ON public.risk_incidents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "risk_incidents_update" ON public.risk_incidents FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "risk_incidents_update_admin" ON public.risk_incidents FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "risk_incidents_delete" ON public.risk_incidents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));
CREATE POLICY "risk_incidents_delete_admin" ON public.risk_incidents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
