-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;

-- Admin & RMQ: see everything
CREATE POLICY "audit_logs_select_admin_rmq" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rmq'::app_role)
);

-- Responsable processus: see own actions (user_id = self)
CREATE POLICY "audit_logs_select_responsable" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'responsable_processus'::app_role) AND user_id = auth.uid()
);

-- Auditeur: see audit-related logs
CREATE POLICY "audit_logs_select_auditeur" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'auditeur'::app_role) AND entity_type IN ('audit', 'audit_finding', 'nonconformity')
);

-- Acteur: see actions and tasks assigned to them
CREATE POLICY "audit_logs_select_acteur" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'acteur'::app_role) AND user_id = auth.uid()
);

-- Allow all authenticated users to insert their own logs
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON public.audit_logs;

CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());