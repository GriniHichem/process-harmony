ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS objectives jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resources_list jsonb DEFAULT '[]';