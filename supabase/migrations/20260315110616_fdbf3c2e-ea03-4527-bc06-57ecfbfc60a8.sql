
ALTER TABLE public.formations ADD COLUMN IF NOT EXISTS type_formation text NOT NULL DEFAULT 'individuelle';
ALTER TABLE public.formations ADD COLUMN IF NOT EXISTS competence_liee text DEFAULT NULL;
