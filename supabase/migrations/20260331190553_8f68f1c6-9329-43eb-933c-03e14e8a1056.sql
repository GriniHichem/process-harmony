
ALTER TABLE public.project_actions
  ADD COLUMN IF NOT EXISTS multi_tasks boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS responsable_id_2 uuid REFERENCES public.acteurs(id),
  ADD COLUMN IF NOT EXISTS responsable_id_3 uuid REFERENCES public.acteurs(id);
