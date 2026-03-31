CREATE TABLE IF NOT EXISTS public.project_deadline_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'action' or 'task'
  entity_id uuid NOT NULL,
  entity_title text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  old_echeance date,
  new_echeance date,
  changed_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_deadline_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deadline logs"
  ON public.project_deadline_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert deadline logs"
  ON public.project_deadline_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_deadline_logs_project ON public.project_deadline_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_deadline_logs_entity ON public.project_deadline_logs(entity_type, entity_id);