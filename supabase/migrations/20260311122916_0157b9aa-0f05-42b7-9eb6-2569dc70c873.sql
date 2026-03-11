
CREATE TABLE public.review_input_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.management_reviews(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.review_input_items(id) ON DELETE CASCADE,
  ordre integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'libre',
  label text NOT NULL DEFAULT '',
  entity_id uuid,
  commentaire text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_input_items ENABLE ROW LEVEL SECURITY;

-- SELECT for all authenticated
CREATE POLICY "rii_select" ON public.review_input_items FOR SELECT TO authenticated USING (true);

-- INSERT for admin + rmq
CREATE POLICY "rii_insert_rmq" ON public.review_input_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "rii_insert_admin" ON public.review_input_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- UPDATE for admin + rmq
CREATE POLICY "rii_update_rmq" ON public.review_input_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "rii_update_admin" ON public.review_input_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- DELETE for admin + rmq
CREATE POLICY "rii_delete_rmq" ON public.review_input_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "rii_delete_admin" ON public.review_input_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER update_review_input_items_updated_at
  BEFORE UPDATE ON public.review_input_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
