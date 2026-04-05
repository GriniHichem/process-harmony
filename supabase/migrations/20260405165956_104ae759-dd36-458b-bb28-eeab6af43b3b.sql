
-- Add responsable and visibility to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS responsable_user_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- Create project_collaborators table
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  access_level text NOT NULL DEFAULT 'read',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS for project_collaborators: authenticated full access
CREATE POLICY "Authenticated users can manage project collaborators"
  ON public.project_collaborators
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
