
-- Add email_sent column to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false;

-- =============================================
-- 1. Recreate all 10 notification triggers (idempotent)
-- =============================================

DROP TRIGGER IF EXISTS notify_actions_change ON public.actions;
CREATE TRIGGER notify_actions_change AFTER INSERT OR UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

DROP TRIGGER IF EXISTS notify_quality_objectives_change ON public.quality_objectives;
CREATE TRIGGER notify_quality_objectives_change AFTER INSERT OR UPDATE ON public.quality_objectives
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

DROP TRIGGER IF EXISTS notify_review_decisions_change ON public.review_decisions;
CREATE TRIGGER notify_review_decisions_change AFTER INSERT OR UPDATE ON public.review_decisions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

DROP TRIGGER IF EXISTS notify_risk_actions_change ON public.risk_actions;
CREATE TRIGGER notify_risk_actions_change AFTER INSERT OR UPDATE ON public.risk_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

DROP TRIGGER IF EXISTS notify_risk_moyens_change ON public.risk_moyens;
CREATE TRIGGER notify_risk_moyens_change AFTER INSERT OR UPDATE ON public.risk_moyens
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

DROP TRIGGER IF EXISTS notify_indicator_actions_change ON public.indicator_actions;
CREATE TRIGGER notify_indicator_actions_change AFTER INSERT OR UPDATE ON public.indicator_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

DROP TRIGGER IF EXISTS notify_indicator_moyens_change ON public.indicator_moyens;
CREATE TRIGGER notify_indicator_moyens_change AFTER INSERT OR UPDATE ON public.indicator_moyens
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

DROP TRIGGER IF EXISTS notify_context_issue_actions_change ON public.context_issue_actions;
CREATE TRIGGER notify_context_issue_actions_change AFTER INSERT OR UPDATE ON public.context_issue_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

DROP TRIGGER IF EXISTS notify_process_tasks_change ON public.process_tasks;
CREATE TRIGGER notify_process_tasks_change AFTER INSERT OR UPDATE ON public.process_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

DROP TRIGGER IF EXISTS notify_processes_change ON public.processes;
CREATE TRIGGER notify_processes_change AFTER INSERT OR UPDATE ON public.processes
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

-- =============================================
-- 2. Auto-dispatch email trigger on notifications
-- =============================================

-- Enable pg_net extension (pre-installed on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.dispatch_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Only dispatch for email or both channels
  IF NEW.channel NOT IN ('email', 'both') THEN
    RETURN NEW;
  END IF;

  -- Read config from app_settings (portable, no vault dependency)
  SELECT value INTO v_supabase_url FROM app_settings WHERE key = 'supabase_url';
  SELECT value INTO v_service_key FROM app_settings WHERE key = 'supabase_service_role_key';

  -- Fallback to environment if app_settings not populated
  IF v_supabase_url IS NULL THEN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;
  IF v_service_key IS NULL THEN
    v_service_key := current_setting('app.settings.service_role_key', true);
  END IF;

  -- If we still don't have config, skip (will be picked up by external worker via email_sent=false)
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Call send-notification-email via pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', COALESCE(NEW.message, ''),
      'entity_url', COALESCE(NEW.entity_url, ''),
      'notif_type', COALESCE(NEW.type, 'assignation')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispatch_email_on_notification ON public.notifications;
CREATE TRIGGER dispatch_email_on_notification AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification_email();
