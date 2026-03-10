
ALTER TABLE public.actions DROP CONSTRAINT IF EXISTS actions_responsable_id_fkey;
ALTER TABLE public.actions ADD CONSTRAINT actions_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.acteurs(id) ON DELETE SET NULL;
