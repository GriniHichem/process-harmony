ALTER TABLE public.project_actions
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;