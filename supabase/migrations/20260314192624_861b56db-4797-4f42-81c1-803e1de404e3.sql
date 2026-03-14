
-- Add mode_sondage column to client_surveys (libre = anonymous, cible = targeted with mandatory email)
ALTER TABLE public.client_surveys 
ADD COLUMN IF NOT EXISTS mode_sondage text NOT NULL DEFAULT 'libre';

-- Add respondent_email column to client_survey_responses
ALTER TABLE public.client_survey_responses 
ADD COLUMN IF NOT EXISTS respondent_email text DEFAULT NULL;
