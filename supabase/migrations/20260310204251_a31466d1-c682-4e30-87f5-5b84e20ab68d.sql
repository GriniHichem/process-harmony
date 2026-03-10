-- Add moyens column to indicators table
ALTER TABLE public.indicators ADD COLUMN moyens text DEFAULT NULL;

-- Create indicator_actions table for action plans
CREATE TABLE public.indicator_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  statut text NOT NULL DEFAULT 'a_faire',
  date_prevue date DEFAULT NULL,
  deadline date DEFAULT NULL,
  responsable text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.indicator_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "indicator_actions_select" ON public.indicator_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "indicator_actions_insert" ON public.indicator_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'rmq'::app_role) OR 
    has_role(auth.uid(), 'responsable_processus'::app_role)
  );

CREATE POLICY "indicator_actions_insert_admin" ON public.indicator_actions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "indicator_actions_update" ON public.indicator_actions
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'rmq'::app_role) OR 
    has_role(auth.uid(), 'responsable_processus'::app_role)
  );

CREATE POLICY "indicator_actions_update_admin" ON public.indicator_actions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "indicator_actions_delete" ON public.indicator_actions
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'rmq'::app_role) OR 
    has_role(auth.uid(), 'responsable_processus'::app_role)
  );

CREATE POLICY "indicator_actions_delete_admin" ON public.indicator_actions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));