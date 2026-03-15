CREATE OR REPLACE FUNCTION dispatch_notification_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  IF NEW.channel IN ('email', 'both') THEN
    SELECT value INTO _url FROM public.app_settings WHERE key = 'supabase_url';
    SELECT value INTO _key FROM public.app_settings WHERE key = 'supabase_service_role_key';
    
    IF _url IS NOT NULL AND _key IS NOT NULL THEN
      PERFORM net.http_post(
        url := _url || '/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _key
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'title', NEW.title,
          'message', COALESCE(NEW.message, ''),
          'entity_url', COALESCE(NEW.entity_url, ''),
          'notif_type', COALESCE(NEW.type, ''),
          'entity_type', COALESCE(NEW.entity_type, ''),
          'entity_id', COALESCE(NEW.entity_id::text, '')
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;