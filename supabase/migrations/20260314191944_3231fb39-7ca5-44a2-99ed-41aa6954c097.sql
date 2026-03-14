
-- Fix storage policies for documents bucket: add admin/super_admin roles
DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;

CREATE POLICY "documents_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'rmq') OR 
    public.has_role(auth.uid(), 'responsable_processus') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "documents_storage_update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'rmq') OR 
    public.has_role(auth.uid(), 'responsable_processus') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "documents_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'rmq') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  )
);
