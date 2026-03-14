
-- Add super_admin INSERT policy for documents
CREATE POLICY "documents_insert_super_admin"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Add super_admin UPDATE policy for documents
CREATE POLICY "documents_update_super_admin"
ON public.documents FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add super_admin DELETE policy for documents
CREATE POLICY "documents_delete_super_admin"
ON public.documents FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add super_admin INSERT policy for document_processes
CREATE POLICY "document_processes_insert_super_admin"
ON public.document_processes FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Add super_admin DELETE policy for document_processes
CREATE POLICY "document_processes_delete_super_admin"
ON public.document_processes FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
