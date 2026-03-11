-- Generic audit logging function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, new_value)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_value, new_value)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_value)
    VALUES (auth.uid(), TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Processes
CREATE TRIGGER audit_processes
AFTER INSERT OR UPDATE OR DELETE ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Process elements
CREATE TRIGGER audit_process_elements
AFTER INSERT OR UPDATE OR DELETE ON public.process_elements
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Process tasks
CREATE TRIGGER audit_process_tasks
AFTER INSERT OR UPDATE OR DELETE ON public.process_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Audits
CREATE TRIGGER audit_audits
AFTER INSERT OR UPDATE OR DELETE ON public.audits
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Audit findings
CREATE TRIGGER audit_audit_findings
AFTER INSERT OR UPDATE OR DELETE ON public.audit_findings
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Non-conformities
CREATE TRIGGER audit_nonconformities
AFTER INSERT OR UPDATE OR DELETE ON public.nonconformities
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Actions
CREATE TRIGGER audit_actions
AFTER INSERT OR UPDATE OR DELETE ON public.actions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Indicators
CREATE TRIGGER audit_indicators
AFTER INSERT OR UPDATE OR DELETE ON public.indicators
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Risks/Opportunities
CREATE TRIGGER audit_risks_opportunities
AFTER INSERT OR UPDATE OR DELETE ON public.risks_opportunities
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Documents
CREATE TRIGGER audit_documents
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Acteurs
CREATE TRIGGER audit_acteurs
AFTER INSERT OR UPDATE OR DELETE ON public.acteurs
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();