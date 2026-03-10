
-- processes: admin can delete/insert/update
CREATE POLICY "processes_delete_admin" ON public.processes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "processes_insert_admin" ON public.processes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "processes_update_admin" ON public.processes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- documents: admin full access
CREATE POLICY "documents_delete_admin" ON public.documents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "documents_insert_admin" ON public.documents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "documents_update_admin" ON public.documents FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- indicators: admin full access
CREATE POLICY "indicators_delete_admin" ON public.indicators FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "indicators_insert_admin" ON public.indicators FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "indicators_update_admin" ON public.indicators FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- indicator_values: admin full access
CREATE POLICY "indicator_values_insert_admin" ON public.indicator_values FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "indicator_values_update_admin" ON public.indicator_values FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "indicator_values_delete_admin" ON public.indicator_values FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- risks_opportunities: admin full access
CREATE POLICY "risks_delete_admin" ON public.risks_opportunities FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "risks_insert_admin" ON public.risks_opportunities FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "risks_update_admin" ON public.risks_opportunities FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- actions: admin full access
CREATE POLICY "actions_delete_admin" ON public.actions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "actions_insert_admin" ON public.actions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "actions_update_admin" ON public.actions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- audits: admin full access
CREATE POLICY "audits_delete_admin" ON public.audits FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "audits_insert_admin" ON public.audits FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "audits_update_admin" ON public.audits FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- audit_findings: admin full access
CREATE POLICY "findings_delete_admin" ON public.audit_findings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "findings_insert_admin" ON public.audit_findings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "findings_update_admin" ON public.audit_findings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- nonconformities: admin full access
CREATE POLICY "nc_delete_admin" ON public.nonconformities FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "nc_insert_admin" ON public.nonconformities FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "nc_update_admin" ON public.nonconformities FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- bpmn_diagrams: admin full access
CREATE POLICY "bpmn_delete_admin" ON public.bpmn_diagrams FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bpmn_insert_admin" ON public.bpmn_diagrams FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bpmn_update_admin" ON public.bpmn_diagrams FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- user_roles: admin can manage
CREATE POLICY "user_roles_insert_admin" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user_roles_update_admin" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user_roles_delete_admin" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles: admin can update
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- process_elements: admin full access
CREATE POLICY "process_elements_insert_admin" ON public.process_elements FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "process_elements_update_admin" ON public.process_elements FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "process_elements_delete_admin" ON public.process_elements FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- process_versions: admin can insert
CREATE POLICY "process_versions_insert_admin" ON public.process_versions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- audit_logs: admin can view and insert
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
