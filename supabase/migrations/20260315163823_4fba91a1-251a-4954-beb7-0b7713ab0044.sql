CREATE OR REPLACE FUNCTION public.dispatch_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _configured_url text;
  _candidate_url text;
  _payload jsonb;
  _headers jsonb := jsonb_build_object('Content-Type', 'application/json');
  _urls text[];
BEGIN
  IF NEW.channel NOT IN ('email', 'both') THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'message', COALESCE(NEW.message, ''),
    'entity_url', COALESCE(NEW.entity_url, ''),
    'notif_type', COALESCE(NEW.type, ''),
    'entity_type', COALESCE(NEW.entity_type, ''),
    'entity_id', COALESCE(NEW.entity_id::text, '')
  );

  SELECT NULLIF(trim(value), '')
    INTO _configured_url
  FROM public.app_settings
  WHERE key = 'supabase_url';

  IF _configured_url LIKE '__%PLACEHOLDER__%' THEN
    _configured_url := NULL;
  END IF;

  IF _configured_url IS NOT NULL THEN
    _urls := ARRAY[
      _configured_url,
      'http://kong:8000',
      'http://host.docker.internal:54321',
      'http://127.0.0.1:54321'
    ];
  ELSE
    _urls := ARRAY[
      'http://kong:8000',
      'http://host.docker.internal:54321',
      'http://127.0.0.1:54321'
    ];
  END IF;

  FOREACH _candidate_url IN ARRAY _urls LOOP
    BEGIN
      EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3)'
      USING _candidate_url || '/functions/v1/send-notification-email', _headers, _payload;
      EXIT;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;