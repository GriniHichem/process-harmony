ALTER TABLE public.management_reviews ADD COLUMN IF NOT EXISTS type_revue TEXT NOT NULL DEFAULT 'processus';
UPDATE public.management_reviews SET type_revue = 'processus' WHERE type_revue IS NULL;