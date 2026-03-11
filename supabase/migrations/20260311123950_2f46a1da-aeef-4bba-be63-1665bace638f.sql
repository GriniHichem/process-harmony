
-- Create review_decisions table
CREATE TABLE public.review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.management_reviews(id) ON DELETE CASCADE,
  input_item_id uuid REFERENCES public.review_input_items(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'decision',
  description text NOT NULL DEFAULT '',
  responsable_id uuid REFERENCES public.acteurs(id) ON DELETE SET NULL,
  echeance date,
  statut text NOT NULL DEFAULT 'a_faire',
  source_entity_type text,
  source_entity_id uuid,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "rd_select" ON public.review_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rd_insert_rmq" ON public.review_decisions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "rd_insert_admin" ON public.review_decisions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "rd_update_rmq" ON public.review_decisions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "rd_update_admin" ON public.review_decisions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "rd_delete_admin" ON public.review_decisions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "rd_delete_rmq" ON public.review_decisions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'rmq'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_review_decisions_updated_at
  BEFORE UPDATE ON public.review_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
