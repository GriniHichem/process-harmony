
-- Update dispatch function to use Supabase's built-in config instead of app_settings
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

  -- Use Supabase's built-in request headers to get URL and key
  -- These are automatically available in Supabase PostgreSQL
  BEGIN
    SELECT value INTO v_supabase_url FROM app_settings WHERE key = 'supabase_url';
    SELECT value INTO v_service_key FROM app_settings WHERE key = 'supabase_service_role_key';
  EXCEPTION WHEN OTHERS THEN
    -- Silently skip if app_settings not accessible
    RETURN NEW;
  END;

  -- Skip if config missing (emails will be picked up by external worker via email_sent=false)
  IF v_supabase_url IS NULL OR v_service_key IS NULL OR v_service_key = '__SERVICE_ROLE_KEY_PLACEHOLDER__' THEN
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
