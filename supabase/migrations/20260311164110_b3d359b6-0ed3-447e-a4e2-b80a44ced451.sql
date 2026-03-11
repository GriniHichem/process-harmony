
DROP POLICY IF EXISTS "element_notes_delete" ON public.element_notes;
CREATE POLICY "element_notes_delete" ON public.element_notes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
