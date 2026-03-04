
-- Create enum for process element types
CREATE TYPE public.process_element_type AS ENUM (
  'finalite',
  'donnee_entree',
  'donnee_sortie',
  'activite',
  'interaction',
  'partie_prenante',
  'ressource'
);

-- Create process_elements table
CREATE TABLE public.process_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  type process_element_type NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(process_id, type, code)
);

-- Enable RLS
ALTER TABLE public.process_elements ENABLE ROW LEVEL SECURITY;

-- RLS policies (same as processes)
CREATE POLICY "process_elements_select" ON public.process_elements FOR SELECT TO authenticated USING (true);
CREATE POLICY "process_elements_insert" ON public.process_elements FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'rmq') OR has_role(auth.uid(), 'responsable_processus') OR has_role(auth.uid(), 'consultant')
  );
CREATE POLICY "process_elements_update" ON public.process_elements FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'rmq') OR has_role(auth.uid(), 'responsable_processus') OR has_role(auth.uid(), 'consultant')
  );
CREATE POLICY "process_elements_delete" ON public.process_elements FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'rmq') OR has_role(auth.uid(), 'responsable_processus')
  );

-- Updated_at trigger
CREATE TRIGGER update_process_elements_updated_at
  BEFORE UPDATE ON public.process_elements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
