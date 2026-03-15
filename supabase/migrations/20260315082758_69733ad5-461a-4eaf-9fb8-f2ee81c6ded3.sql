
-- =====================================================
-- NOTIFICATION SYSTEM - Tables, Functions, Triggers
-- =====================================================

-- 1. Table notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'assignation',
  title text NOT NULL DEFAULT '',
  message text DEFAULT '',
  entity_type text,
  entity_id uuid,
  entity_url text,
  is_read boolean NOT NULL DEFAULT false,
  channel text NOT NULL DEFAULT 'push',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Table notification_preferences
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  assignation text NOT NULL DEFAULT 'both',
  echeance_proche text NOT NULL DEFAULT 'push',
  retard text NOT NULL DEFAULT 'both',
  statut_change text NOT NULL DEFAULT 'push',
  rappel_jours integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notif_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notif_insert_system" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifpref_select_own" ON public.notification_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifpref_update_own" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifpref_insert_own" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifpref_delete_own" ON public.notification_preferences
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. Updated_at trigger on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Notify responsibility change function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.notify_responsibility_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_responsible_acteur_id uuid;
  v_old_responsible_acteur_id uuid;
  v_user_id uuid;
  v_old_user_id uuid;
  v_entity_type text;
  v_entity_url text;
  v_title text;
  v_message text;
  v_pref_channel text;
  v_description text;
BEGIN
  v_entity_type := TG_TABLE_NAME;

  -- Extract responsible acteur_id based on column name
  IF TG_TABLE_NAME IN ('actions', 'process_tasks', 'processes', 'quality_objectives', 'review_decisions') THEN
    v_responsible_acteur_id := NEW.responsable_id;
    IF TG_OP = 'UPDATE' THEN
      v_old_responsible_acteur_id := OLD.responsable_id;
    END IF;
  ELSE
    -- Tables with text 'responsable' column (acteur_id as text)
    BEGIN
      v_responsible_acteur_id := NEW.responsable::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_responsible_acteur_id := NULL;
    END;
    IF TG_OP = 'UPDATE' THEN
      BEGIN
        v_old_responsible_acteur_id := OLD.responsable::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_old_responsible_acteur_id := NULL;
      END;
    END IF;
  END IF;

  -- Resolve user_id from acteur_id
  IF v_responsible_acteur_id IS NOT NULL THEN
    SELECT id INTO v_user_id FROM public.profiles WHERE acteur_id = v_responsible_acteur_id LIMIT 1;
  END IF;

  -- Skip if no user found
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get description for message
  IF TG_TABLE_NAME IN ('actions', 'risk_actions', 'indicator_actions', 'context_issue_actions') THEN
    v_description := NEW.description;
  ELSIF TG_TABLE_NAME = 'processes' THEN
    v_description := NEW.nom;
  ELSIF TG_TABLE_NAME = 'process_tasks' THEN
    v_description := NEW.description;
  ELSIF TG_TABLE_NAME = 'quality_objectives' THEN
    v_description := NEW.description;
  ELSIF TG_TABLE_NAME = 'review_decisions' THEN
    v_description := NEW.description;
  ELSIF TG_TABLE_NAME IN ('risk_moyens', 'indicator_moyens') THEN
    v_description := NEW.description;
  ELSE
    v_description := '';
  END IF;

  -- Build entity_url
  CASE TG_TABLE_NAME
    WHEN 'actions' THEN v_entity_url := '/actions';
    WHEN 'process_tasks' THEN v_entity_url := '/processus/' || NEW.process_id;
    WHEN 'processes' THEN v_entity_url := '/processus/' || NEW.id;
    WHEN 'quality_objectives' THEN v_entity_url := '/politique-qualite';
    WHEN 'review_decisions' THEN v_entity_url := '/revue-direction';
    WHEN 'risk_actions' THEN v_entity_url := '/risques';
    WHEN 'risk_moyens' THEN v_entity_url := '/risques';
    WHEN 'indicator_actions' THEN v_entity_url := '/indicateurs';
    WHEN 'indicator_moyens' THEN v_entity_url := '/indicateurs';
    WHEN 'context_issue_actions' THEN v_entity_url := '/enjeux-contexte';
    ELSE v_entity_url := '/';
  END CASE;

  -- CHECK ASSIGNATION (new or changed)
  IF TG_OP = 'INSERT' AND v_responsible_acteur_id IS NOT NULL THEN
    v_title := 'Nouvelle assignation';
    v_message := 'Vous avez ete assigne a : ' || COALESCE(left(v_description, 100), v_entity_type);

    -- Get preference
    SELECT assignation INTO v_pref_channel FROM public.notification_preferences WHERE notification_preferences.user_id = v_user_id;
    IF v_pref_channel IS NULL THEN v_pref_channel := 'both'; END IF;

    IF v_pref_channel != 'none' THEN
      INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, entity_url, channel)
      VALUES (v_user_id, 'assignation', v_title, v_message, v_entity_type, NEW.id, v_entity_url, v_pref_channel);
    END IF;

  ELSIF TG_OP = 'UPDATE' AND v_responsible_acteur_id IS DISTINCT FROM v_old_responsible_acteur_id AND v_responsible_acteur_id IS NOT NULL THEN
    v_title := 'Nouvelle assignation';
    v_message := 'Vous avez ete assigne a : ' || COALESCE(left(v_description, 100), v_entity_type);

    SELECT assignation INTO v_pref_channel FROM public.notification_preferences WHERE notification_preferences.user_id = v_user_id;
    IF v_pref_channel IS NULL THEN v_pref_channel := 'both'; END IF;

    IF v_pref_channel != 'none' THEN
      INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, entity_url, channel)
      VALUES (v_user_id, 'assignation', v_title, v_message, v_entity_type, NEW.id, v_entity_url, v_pref_channel);
    END IF;
  END IF;

  -- CHECK STATUS CHANGE
  IF TG_OP = 'UPDATE' AND NEW.statut IS DISTINCT FROM OLD.statut AND v_responsible_acteur_id IS NOT NULL THEN
    v_title := 'Changement de statut';
    v_message := COALESCE(left(v_description, 80), v_entity_type) || ' : ' || OLD.statut || ' → ' || NEW.statut;

    SELECT statut_change INTO v_pref_channel FROM public.notification_preferences WHERE notification_preferences.user_id = v_user_id;
    IF v_pref_channel IS NULL THEN v_pref_channel := 'push'; END IF;

    IF v_pref_channel != 'none' THEN
      INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, entity_url, channel)
      VALUES (v_user_id, 'statut_change', v_title, v_message, v_entity_type, NEW.id, v_entity_url, v_pref_channel);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Attach triggers to all 10 tables
CREATE TRIGGER notify_actions_change AFTER INSERT OR UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_process_tasks_change AFTER INSERT OR UPDATE ON public.process_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_processes_change AFTER INSERT OR UPDATE ON public.processes
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_quality_objectives_change AFTER INSERT OR UPDATE ON public.quality_objectives
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_review_decisions_change AFTER INSERT OR UPDATE ON public.review_decisions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_risk_actions_change AFTER INSERT OR UPDATE ON public.risk_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_risk_moyens_change AFTER INSERT OR UPDATE ON public.risk_moyens
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_indicator_actions_change AFTER INSERT OR UPDATE ON public.indicator_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_indicator_moyens_change AFTER INSERT OR UPDATE ON public.indicator_moyens
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_context_issue_actions_change AFTER INSERT OR UPDATE ON public.context_issue_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

-- 8. Enable realtime on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
