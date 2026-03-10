
CREATE TABLE public.action_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL DEFAULT '',
  avancement INTEGER NOT NULL DEFAULT 0,
  date_note DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.action_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_notes_select" ON public.action_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "action_notes_insert" ON public.action_notes FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'responsable_processus'::app_role)
    OR has_role(auth.uid(), 'auditeur'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "action_notes_update" ON public.action_notes FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'responsable_processus'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "action_notes_delete" ON public.action_notes FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
