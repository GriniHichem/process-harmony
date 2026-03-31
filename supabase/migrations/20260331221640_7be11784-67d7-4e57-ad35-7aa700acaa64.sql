-- Fix: include super_admin in the management policy for document_actor_permissions
DROP POLICY IF EXISTS "Admin/RMQ can manage document_actor_permissions" ON public.document_actor_permissions;

CREATE POLICY "Admin/RMQ/SuperAdmin can manage document_actor_permissions"
  ON public.document_actor_permissions
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );