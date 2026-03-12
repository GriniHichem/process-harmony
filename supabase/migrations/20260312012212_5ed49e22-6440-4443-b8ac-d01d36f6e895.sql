
-- Create client_surveys table
CREATE TABLE public.client_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  product_service text NOT NULL DEFAULT '',
  public_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_surveys_public_token_key UNIQUE (public_token)
);

ALTER TABLE public.client_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_select_auth" ON public.client_surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "cs_select_anon" ON public.client_surveys FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "cs_insert_admin" ON public.client_surveys FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cs_insert_rmq" ON public.client_surveys FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "cs_update_admin" ON public.client_surveys FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cs_update_rmq" ON public.client_surveys FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "cs_delete_admin" ON public.client_surveys FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cs_delete_rmq" ON public.client_surveys FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));

-- Create client_survey_questions table
CREATE TABLE public.client_survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.client_surveys(id) ON DELETE CASCADE,
  question_text text NOT NULL DEFAULT '',
  question_type text NOT NULL DEFAULT 'satisfaction',
  image_url text,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csq_select_auth" ON public.client_survey_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "csq_select_anon" ON public.client_survey_questions FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.client_surveys WHERE id = survey_id AND status = 'active')
);
CREATE POLICY "csq_insert_admin" ON public.client_survey_questions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "csq_insert_rmq" ON public.client_survey_questions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "csq_update_admin" ON public.client_survey_questions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "csq_update_rmq" ON public.client_survey_questions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "csq_delete_admin" ON public.client_survey_questions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "csq_delete_rmq" ON public.client_survey_questions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));

-- Create client_survey_responses table
CREATE TABLE public.client_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.client_surveys(id) ON DELETE CASCADE,
  respondent_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csr_select_auth" ON public.client_survey_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "csr_insert_anon" ON public.client_survey_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "csr_insert_auth" ON public.client_survey_responses FOR INSERT TO authenticated WITH CHECK (true);

-- Create client_survey_answers table
CREATE TABLE public.client_survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.client_survey_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.client_survey_questions(id) ON DELETE CASCADE,
  answer_text text NOT NULL DEFAULT '',
  answer_value integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csa_select_auth" ON public.client_survey_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "csa_insert_anon" ON public.client_survey_answers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "csa_insert_auth" ON public.client_survey_answers FOR INSERT TO authenticated WITH CHECK (true);

-- Create client_survey_comments table (for categorization)
CREATE TABLE public.client_survey_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.client_survey_responses(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.client_survey_questions(id) ON DELETE SET NULL,
  comment_text text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'suggestion',
  action_id uuid REFERENCES public.actions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_survey_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csc_select_auth" ON public.client_survey_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "csc_insert_anon" ON public.client_survey_comments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "csc_insert_auth" ON public.client_survey_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "csc_update_admin" ON public.client_survey_comments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "csc_update_rmq" ON public.client_survey_comments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));

-- Create storage bucket for survey images
INSERT INTO storage.buckets (id, name, public) VALUES ('survey-images', 'survey-images', true);

CREATE POLICY "survey_images_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'survey-images');
CREATE POLICY "survey_images_insert_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'survey-images');
CREATE POLICY "survey_images_delete_auth" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'survey-images');
