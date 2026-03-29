
-- Add section_title and evaluation_config to client_survey_questions
ALTER TABLE public.client_survey_questions
ADD COLUMN IF NOT EXISTS section_title text,
ADD COLUMN IF NOT EXISTS evaluation_config jsonb;
