
CREATE TABLE IF NOT EXISTS public.project_action_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.project_actions(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('indicator', 'risk', 'context_issue', 'nonconformity')),
  entity_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(action_id, entity_type, entity_id)
);

ALTER TABLE public.project_action_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage project_action_links"
  ON public.project_action_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
