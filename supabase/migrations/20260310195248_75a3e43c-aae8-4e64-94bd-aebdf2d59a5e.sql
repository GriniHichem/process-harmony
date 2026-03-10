
CREATE TABLE public.process_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  target_process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  element_id uuid NOT NULL REFERENCES public.process_elements(id) ON DELETE CASCADE,
  direction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_process_id, target_process_id, element_id)
);

-- Create a validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_interaction_direction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.direction NOT IN ('entree', 'sortie') THEN
    RAISE EXCEPTION 'direction must be entree or sortie';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_interaction_direction
  BEFORE INSERT OR UPDATE ON public.process_interactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_interaction_direction();

ALTER TABLE public.process_interactions ENABLE ROW LEVEL SECURITY;

-- SELECT for all authenticated
CREATE POLICY "interactions_select" ON public.process_interactions
  FOR SELECT TO authenticated USING (true);

-- INSERT for rmq, responsable_processus, consultant
CREATE POLICY "interactions_insert" ON public.process_interactions
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'responsable_processus'::app_role)
    OR has_role(auth.uid(), 'consultant'::app_role)
  );

CREATE POLICY "interactions_insert_admin" ON public.process_interactions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- DELETE for rmq, responsable_processus
CREATE POLICY "interactions_delete" ON public.process_interactions
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'responsable_processus'::app_role)
  );

CREATE POLICY "interactions_delete_admin" ON public.process_interactions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
