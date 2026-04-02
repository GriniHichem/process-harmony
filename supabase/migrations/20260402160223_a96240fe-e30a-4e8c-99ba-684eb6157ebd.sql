
-- Index for pagination performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

-- Triggers for missing tables
CREATE TRIGGER trg_audit_indicator_values
  AFTER INSERT OR UPDATE OR DELETE ON public.indicator_values
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_context_issues
  AFTER INSERT OR UPDATE OR DELETE ON public.context_issues
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_formations
  AFTER INSERT OR UPDATE OR DELETE ON public.formations
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_competences
  AFTER INSERT OR UPDATE OR DELETE ON public.competences
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_client_surveys
  AFTER INSERT OR UPDATE OR DELETE ON public.client_surveys
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_management_reviews
  AFTER INSERT OR UPDATE OR DELETE ON public.management_reviews
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_process_evaluations
  AFTER INSERT OR UPDATE OR DELETE ON public.process_evaluations
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_bpmn_diagrams
  AFTER INSERT OR UPDATE OR DELETE ON public.bpmn_diagrams
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
