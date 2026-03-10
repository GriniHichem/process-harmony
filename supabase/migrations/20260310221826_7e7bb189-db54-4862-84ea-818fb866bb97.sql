
-- Audits: add programme, fréquence, méthodes, responsabilités, preuve, résultats
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS frequence text;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS methodes text;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS responsabilites text;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS programme text;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS preuve_realisation text;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS resultats text;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS checklist jsonb;

-- Non-conformités: cause racine, correction immédiate, plan d'action, vérification, lien audit, nature, criticité
ALTER TABLE public.nonconformities ADD COLUMN IF NOT EXISTS cause_racine text;
ALTER TABLE public.nonconformities ADD COLUMN IF NOT EXISTS correction_immediate text;
ALTER TABLE public.nonconformities ADD COLUMN IF NOT EXISTS plan_action text;
ALTER TABLE public.nonconformities ADD COLUMN IF NOT EXISTS verification_efficacite text;
ALTER TABLE public.nonconformities ADD COLUMN IF NOT EXISTS resultats_actions text;
ALTER TABLE public.nonconformities ADD COLUMN IF NOT EXISTS audit_id uuid REFERENCES public.audits(id) ON DELETE SET NULL;
ALTER TABLE public.nonconformities ADD COLUMN IF NOT EXISTS nature_nc text;
ALTER TABLE public.nonconformities ADD COLUMN IF NOT EXISTS criticite integer;

-- Extend nc_status enum for full workflow
ALTER TYPE public.nc_status ADD VALUE IF NOT EXISTS 'correction';
ALTER TYPE public.nc_status ADD VALUE IF NOT EXISTS 'analyse_cause';
ALTER TYPE public.nc_status ADD VALUE IF NOT EXISTS 'action_corrective';
ALTER TYPE public.nc_status ADD VALUE IF NOT EXISTS 'verification';
