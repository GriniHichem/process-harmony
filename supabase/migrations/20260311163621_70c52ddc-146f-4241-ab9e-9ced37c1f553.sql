
-- Generic element_notes table for notes on any element (actions, moyens across all modules)
CREATE TABLE public.element_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_type text NOT NULL, -- 'action_note', 'risk_action', 'risk_moyen', 'indicator_action', 'indicator_moyen'
  element_id uuid NOT NULL,
  contenu text NOT NULL DEFAULT '',
  avancement integer NOT NULL DEFAULT 0,
  date_note date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_response boolean NOT NULL DEFAULT false,
  parent_note_id uuid REFERENCES public.element_notes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.element_notes ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "element_notes_select" ON public.element_notes
  FOR SELECT TO authenticated USING (true);

-- Admin, RMQ, responsable_processus can always insert
CREATE POLICY "element_notes_insert_managers" ON public.element_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rmq'::app_role) OR
    has_role(auth.uid(), 'responsable_processus'::app_role)
  );

-- Acteurs can insert notes (they are responsible for actions/moyens assigned to them)
CREATE POLICY "element_notes_insert_acteur" ON public.element_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'acteur'::app_role) AND
    created_by = auth.uid()
  );

-- Auditeurs can insert notes too
CREATE POLICY "element_notes_insert_auditeur" ON public.element_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'auditeur'::app_role) AND
    created_by = auth.uid()
  );

-- Only admin/rmq can delete notes
CREATE POLICY "element_notes_delete" ON public.element_notes
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rmq'::app_role)
  );

-- Update own notes only
CREATE POLICY "element_notes_update_own" ON public.element_notes
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- Also update RLS for existing action_notes to allow acteurs
CREATE POLICY "action_notes_insert_acteur" ON public.action_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'acteur'::app_role) AND
    created_by = auth.uid()
  );
