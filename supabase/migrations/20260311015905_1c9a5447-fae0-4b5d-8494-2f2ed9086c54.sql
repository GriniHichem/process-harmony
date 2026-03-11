ALTER TABLE public.processes ALTER COLUMN version_courante TYPE numeric USING version_courante::numeric;
ALTER TABLE public.processes ALTER COLUMN version_courante SET DEFAULT 1.00;