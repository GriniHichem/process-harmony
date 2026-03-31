
CREATE OR REPLACE FUNCTION public.notify_responsibility_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_responsible_acteur_id uuid;
  v_old_responsible_acteur_id uuid;
  v_user_id uuid;
  v_entity_type text;
  v_entity_url text;
  v_title text;
  v_message text;
  v_pref_channel text;
  v_description text;
  v_new_statut text;
  v_old_statut text;
  v_project_id uuid;
BEGIN
  v_entity_type := TG_TABLE_NAME;

  IF TG_TABLE_NAME IN ('actions', 'process_tasks', 'processes', 'quality_objectives', 'review_decisions', 'project_actions', 'project_tasks') THEN
    v_responsible_acteur_id := NEW.responsable_id;
    IF TG_OP = 'UPDATE' THEN
      v_old_responsible_acteur_id := OLD.responsable_id;
    END IF;
  ELSE
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

  BEGIN
    v_user_id := (to_jsonb(NEW) ->> 'responsable_user_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NULL AND v_responsible_acteur_id IS NOT NULL THEN
    SELECT id INTO v_user_id FROM public.profiles WHERE acteur_id = v_responsible_acteur_id AND actif = true LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'processes' THEN
    v_description := NEW.nom;
  ELSIF TG_TABLE_NAME IN ('project_actions', 'project_tasks') THEN
    v_description := NEW.title;
  ELSE
    v_description := NEW.description;
  END IF;

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
    WHEN 'nc_actions' THEN v_entity_url := '/non-conformites';
    WHEN 'project_actions' THEN v_entity_url := '/projects/' || NEW.project_id;
    WHEN 'project_tasks' THEN
      SELECT project_id INTO v_project_id FROM public.project_actions WHERE id = NEW.action_id LIMIT 1;
      v_entity_url := '/projects/' || COALESCE(v_project_id::text, '');
    ELSE v_entity_url := '/';
  END CASE;

  IF (TG_OP = 'INSERT' AND v_responsible_acteur_id IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND v_responsible_acteur_id IS DISTINCT FROM v_old_responsible_acteur_id AND v_responsible_acteur_id IS NOT NULL) THEN
    v_title := 'Nouvelle assignation';
    v_message := 'Vous avez ete assigne a : ' || COALESCE(left(v_description, 100), v_entity_type);
    v_pref_channel := resolve_notification_channel(v_user_id, v_entity_type, 'assignation');

    IF v_pref_channel != 'none' THEN
      INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, entity_url, channel)
      VALUES (v_user_id, 'assignation', v_title, v_message, v_entity_type, NEW.id, v_entity_url, v_pref_channel);
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_new_statut := to_jsonb(NEW) ->> 'statut';
    v_old_statut := to_jsonb(OLD) ->> 'statut';
    IF v_new_statut IS NOT NULL AND v_new_statut IS DISTINCT FROM v_old_statut AND v_responsible_acteur_id IS NOT NULL THEN
      v_title := 'Changement de statut';
      v_message := COALESCE(left(v_description, 80), v_entity_type) || ' : ' || v_old_statut || ' → ' || v_new_statut;
      v_pref_channel := resolve_notification_channel(v_user_id, v_entity_type, 'statut_change');

      IF v_pref_channel != 'none' THEN
        INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, entity_url, channel)
        VALUES (v_user_id, 'statut_change', v_title, v_message, v_entity_type, NEW.id, v_entity_url, v_pref_channel);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
