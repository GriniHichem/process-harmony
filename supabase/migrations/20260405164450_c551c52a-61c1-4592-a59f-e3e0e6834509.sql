
-- Table des dépendances entre actions de projet
CREATE TABLE public.project_action_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  source_action_id uuid REFERENCES public.project_actions(id) ON DELETE CASCADE NOT NULL,
  target_action_id uuid REFERENCES public.project_actions(id) ON DELETE CASCADE NOT NULL,
  dependency_type text NOT NULL DEFAULT 'before',
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_action_id, target_action_id)
);

-- RLS
ALTER TABLE public.project_action_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dependencies"
  ON public.project_action_dependencies FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dependencies"
  ON public.project_action_dependencies FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update dependencies"
  ON public.project_action_dependencies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dependencies"
  ON public.project_action_dependencies FOR DELETE
  TO authenticated USING (true);
