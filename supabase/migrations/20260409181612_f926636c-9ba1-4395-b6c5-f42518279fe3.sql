
-- Table: project_action_comments
CREATE TABLE public.project_action_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.project_actions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_action_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comments"
  ON public.project_action_comments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can insert their own comments"
  ON public.project_action_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can update their own comments"
  ON public.project_action_comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authors and admins can delete comments"
  ON public.project_action_comments FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'rmq')
  );

CREATE TRIGGER update_project_action_comments_updated_at
  BEFORE UPDATE ON public.project_action_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: project_action_history
CREATE TABLE public.project_action_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.project_actions(id) ON DELETE CASCADE,
  user_id UUID,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_action_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read history"
  ON public.project_action_history FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "System can insert history"
  ON public.project_action_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- Trigger function to log changes on project_actions
CREATE OR REPLACE FUNCTION public.log_project_action_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _fields text[] := ARRAY['title','description','statut','avancement','echeance','date_debut','responsable_id','responsable_id_2','responsable_id_3','responsable_user_id','multi_tasks','pinned','poids','ordre'];
  _field text;
  _old_val text;
  _new_val text;
BEGIN
  FOREACH _field IN ARRAY _fields LOOP
    _old_val := (to_jsonb(OLD) ->> _field);
    _new_val := (to_jsonb(NEW) ->> _field);
    IF _old_val IS DISTINCT FROM _new_val THEN
      INSERT INTO public.project_action_history (action_id, user_id, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), _field, _old_val, _new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_project_action_changes
  AFTER UPDATE ON public.project_actions
  FOR EACH ROW EXECUTE FUNCTION public.log_project_action_changes();
