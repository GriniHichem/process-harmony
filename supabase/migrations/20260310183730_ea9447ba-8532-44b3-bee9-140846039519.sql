
-- Drop RESTRICTIVE policies on document_processes
DROP POLICY IF EXISTS "document_processes_insert" ON public.document_processes;
DROP POLICY IF EXISTS "document_processes_insert_admin" ON public.document_processes;
DROP POLICY IF EXISTS "document_processes_delete" ON public.document_processes;
DROP POLICY IF EXISTS "document_processes_delete_admin" ON public.document_processes;

-- Recreate as PERMISSIVE (single combined policy each)
CREATE POLICY "document_processes_insert" ON public.document_processes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'responsable_processus'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "document_processes_delete" ON public.document_processes
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
