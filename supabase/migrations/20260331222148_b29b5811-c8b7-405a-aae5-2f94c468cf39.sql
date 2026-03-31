
-- Drop and recreate the entity_type check constraint to include new types
ALTER TABLE public.notification_config DROP CONSTRAINT notification_config_entity_type_check;
ALTER TABLE public.notification_config ADD CONSTRAINT notification_config_entity_type_check
  CHECK (entity_type = ANY (ARRAY[
    'actions','quality_objectives','review_decisions','risk_actions','risk_moyens',
    'indicator_actions','indicator_moyens','context_issue_actions','process_tasks',
    'processes','nc_actions','project_actions','project_tasks'
  ]));

-- Create triggers for project_actions and project_tasks
CREATE TRIGGER notify_project_actions_change
  AFTER INSERT OR UPDATE ON public.project_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

CREATE TRIGGER notify_project_tasks_change
  AFTER INSERT OR UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_responsibility_change();

-- Insert default notification_config for project_actions and project_tasks
INSERT INTO public.notification_config (entity_type, notif_type, channel, scope) VALUES
  ('project_actions', 'assignation', 'both', 'global'),
  ('project_actions', 'echeance_proche', 'push', 'global'),
  ('project_actions', 'retard', 'both', 'global'),
  ('project_actions', 'statut_change', 'push', 'global'),
  ('project_tasks', 'assignation', 'push', 'global'),
  ('project_tasks', 'echeance_proche', 'push', 'global'),
  ('project_tasks', 'retard', 'both', 'global'),
  ('project_tasks', 'statut_change', 'push', 'global')
ON CONFLICT DO NOTHING;
