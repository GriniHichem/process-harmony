
-- Junction table for many-to-many documents <-> processes
CREATE TABLE public.document_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, process_id)
);

ALTER TABLE public.document_processes ENABLE ROW LEVEL SECURITY;

-- Select: all authenticated
CREATE POLICY "document_processes_select" ON public.document_processes
  FOR SELECT TO authenticated USING (true);

-- Insert: rmq, responsable_processus, admin
CREATE POLICY "document_processes_insert" ON public.document_processes
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'rmq'::app_role) 
    OR has_role(auth.uid(), 'responsable_processus'::app_role)
  );

CREATE POLICY "document_processes_insert_admin" ON public.document_processes
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Delete: rmq, admin
CREATE POLICY "document_processes_delete" ON public.document_processes
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'rmq'::app_role));

CREATE POLICY "document_processes_delete_admin" ON public.document_processes
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing process_id data to junction table
INSERT INTO public.document_processes (document_id, process_id)
SELECT id, process_id FROM public.documents WHERE process_id IS NOT NULL
ON CONFLICT DO NOTHING;
