
-- Table nc_actions (structured actions for non-conformities)
CREATE TABLE IF NOT EXISTS public.nc_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id UUID NOT NULL REFERENCES public.nonconformities(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  type_action TEXT NOT NULL DEFAULT 'corrective',
  statut TEXT NOT NULL DEFAULT 'a_faire',
  date_prevue DATE,
  deadline DATE,
  responsable TEXT,
  responsable_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table nc_root_cause_analyses
CREATE TABLE IF NOT EXISTS public.nc_root_cause_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id UUID NOT NULL REFERENCES public.nonconformities(id) ON DELETE CASCADE,
  methode TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  conclusion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for nc_actions
ALTER TABLE public.nc_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nc_actions_select" ON public.nc_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "nc_actions_insert" ON public.nc_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
    OR public.has_role(auth.uid(), 'responsable_processus')
  );

CREATE POLICY "nc_actions_update" ON public.nc_actions
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
    OR public.has_role(auth.uid(), 'responsable_processus')
  );

CREATE POLICY "nc_actions_delete" ON public.nc_actions
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
  );

-- RLS for nc_root_cause_analyses
ALTER TABLE public.nc_root_cause_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nc_rca_select" ON public.nc_root_cause_analyses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "nc_rca_insert" ON public.nc_root_cause_analyses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
    OR public.has_role(auth.uid(), 'responsable_processus')
  );

CREATE POLICY "nc_rca_update" ON public.nc_root_cause_analyses
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
    OR public.has_role(auth.uid(), 'responsable_processus')
  );

CREATE POLICY "nc_rca_delete" ON public.nc_root_cause_analyses
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
  );

-- Updated_at triggers
CREATE TRIGGER update_nc_actions_updated_at
  BEFORE UPDATE ON public.nc_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nc_rca_updated_at
  BEFORE UPDATE ON public.nc_root_cause_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log triggers
CREATE TRIGGER audit_nc_actions
  AFTER INSERT OR UPDATE OR DELETE ON public.nc_actions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_nc_rca
  AFTER INSERT OR UPDATE OR DELETE ON public.nc_root_cause_analyses
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Notification trigger for nc_actions
CREATE TRIGGER notify_nc_actions_responsibility
  AFTER INSERT OR UPDATE ON public.nc_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();
