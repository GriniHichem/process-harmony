
-- Create notification_config table
CREATE TABLE public.notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  entity_type text NOT NULL,
  notif_type text NOT NULL,
  channel text NOT NULL DEFAULT 'both',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_config_unique UNIQUE (scope, entity_type, notif_type),
  CONSTRAINT notification_config_channel_check CHECK (channel IN ('push', 'email', 'both', 'none')),
  CONSTRAINT notification_config_notif_type_check CHECK (notif_type IN ('assignation', 'echeance_proche', 'retard', 'statut_change')),
  CONSTRAINT notification_config_entity_type_check CHECK (entity_type IN ('actions', 'quality_objectives', 'review_decisions', 'risk_actions', 'risk_moyens', 'indicator_actions', 'indicator_moyens', 'context_issue_actions', 'process_tasks', 'processes'))
);

-- Enable RLS
ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "nc_select" ON public.notification_config FOR SELECT TO authenticated USING (true);

-- Admin/super_admin can manage global scope
CREATE POLICY "nc_insert_admin" ON public.notification_config FOR INSERT TO authenticated
  WITH CHECK (
    (scope = 'global' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)))
    OR scope = auth.uid()::text
  );

CREATE POLICY "nc_update_admin" ON public.notification_config FOR UPDATE TO authenticated
  USING (
    (scope = 'global' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)))
    OR scope = auth.uid()::text
  );

CREATE POLICY "nc_delete_admin" ON public.notification_config FOR DELETE TO authenticated
  USING (
    (scope = 'global' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)))
    OR scope = auth.uid()::text
  );

-- Seed global defaults
INSERT INTO public.notification_config (scope, entity_type, notif_type, channel) VALUES
  ('global', 'actions', 'assignation', 'both'),
  ('global', 'actions', 'echeance_proche', 'push'),
  ('global', 'actions', 'retard', 'both'),
  ('global', 'actions', 'statut_change', 'push'),
  ('global', 'quality_objectives', 'assignation', 'both'),
  ('global', 'quality_objectives', 'echeance_proche', 'push'),
  ('global', 'quality_objectives', 'retard', 'both'),
  ('global', 'quality_objectives', 'statut_change', 'push'),
  ('global', 'review_decisions', 'assignation', 'both'),
  ('global', 'review_decisions', 'echeance_proche', 'push'),
  ('global', 'review_decisions', 'retard', 'both'),
  ('global', 'review_decisions', 'statut_change', 'push'),
  ('global', 'risk_actions', 'assignation', 'push'),
  ('global', 'risk_actions', 'echeance_proche', 'email'),
  ('global', 'risk_actions', 'retard', 'both'),
  ('global', 'risk_actions', 'statut_change', 'none'),
  ('global', 'risk_moyens', 'assignation', 'push'),
  ('global', 'risk_moyens', 'echeance_proche', 'push'),
  ('global', 'risk_moyens', 'retard', 'both'),
  ('global', 'risk_moyens', 'statut_change', 'none'),
  ('global', 'indicator_actions', 'assignation', 'push'),
  ('global', 'indicator_actions', 'echeance_proche', 'push'),
  ('global', 'indicator_actions', 'retard', 'both'),
  ('global', 'indicator_actions', 'statut_change', 'push'),
  ('global', 'indicator_moyens', 'assignation', 'push'),
  ('global', 'indicator_moyens', 'echeance_proche', 'push'),
  ('global', 'indicator_moyens', 'retard', 'both'),
  ('global', 'indicator_moyens', 'statut_change', 'none'),
  ('global', 'context_issue_actions', 'assignation', 'push'),
  ('global', 'context_issue_actions', 'echeance_proche', 'push'),
  ('global', 'context_issue_actions', 'retard', 'both'),
  ('global', 'context_issue_actions', 'statut_change', 'push'),
  ('global', 'process_tasks', 'assignation', 'push'),
  ('global', 'process_tasks', 'echeance_proche', 'none'),
  ('global', 'process_tasks', 'retard', 'none'),
  ('global', 'process_tasks', 'statut_change', 'push'),
  ('global', 'processes', 'assignation', 'push'),
  ('global', 'processes', 'echeance_proche', 'none'),
  ('global', 'processes', 'retard', 'none'),
  ('global', 'processes', 'statut_change', 'push');

-- Create resolution function for use in triggers and edge functions
CREATE OR REPLACE FUNCTION public.resolve_notification_channel(
  _user_id uuid,
  _entity_type text,
  _notif_type text
) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT channel FROM notification_config WHERE scope = _user_id::text AND entity_type = _entity_type AND notif_type = _notif_type),
    (SELECT channel FROM notification_config WHERE scope = 'global' AND entity_type = _entity_type AND notif_type = _notif_type),
    'both'
  )
$$;
