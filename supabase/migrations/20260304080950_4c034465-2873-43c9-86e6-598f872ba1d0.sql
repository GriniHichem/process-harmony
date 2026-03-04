
-- Fix permissive RLS policies

-- process_versions: only allow insert for authenticated users with proper roles
DROP POLICY "process_versions_insert" ON public.process_versions;
CREATE POLICY "process_versions_insert" ON public.process_versions FOR INSERT TO authenticated 
WITH CHECK (
  public.has_role(auth.uid(), 'rmq') OR public.has_role(auth.uid(), 'responsable_processus') OR public.has_role(auth.uid(), 'consultant')
);

-- audit_logs: only allow insert for authenticated users (system logging)
DROP POLICY "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());
