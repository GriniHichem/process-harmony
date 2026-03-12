
-- Add type_sondage and objectif columns to client_surveys
ALTER TABLE public.client_surveys 
  ADD COLUMN IF NOT EXISTS type_sondage text NOT NULL DEFAULT 'satisfaction_globale',
  ADD COLUMN IF NOT EXISTS objectif text NOT NULL DEFAULT '';

-- Create sharing table for surveys with process managers
CREATE TABLE public.client_survey_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.client_surveys(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(survey_id, shared_with_user_id)
);

ALTER TABLE public.client_survey_shares ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated can SELECT shares
CREATE POLICY "css_select_auth" ON public.client_survey_shares
  FOR SELECT TO authenticated USING (true);

-- RLS: admin/rmq can manage shares
CREATE POLICY "css_insert_admin" ON public.client_survey_shares
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "css_insert_rmq" ON public.client_survey_shares
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'rmq'::app_role));

CREATE POLICY "css_delete_admin" ON public.client_survey_shares
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "css_delete_rmq" ON public.client_survey_shares
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));
