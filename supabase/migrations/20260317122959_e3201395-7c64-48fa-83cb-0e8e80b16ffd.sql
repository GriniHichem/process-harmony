
-- Add responsable_user_id to all tables that need user-level assignment
ALTER TABLE public.risk_actions ADD COLUMN IF NOT EXISTS responsable_user_id uuid;
ALTER TABLE public.risk_moyens ADD COLUMN IF NOT EXISTS responsable_user_id uuid;
ALTER TABLE public.indicator_actions ADD COLUMN IF NOT EXISTS responsable_user_id uuid;
ALTER TABLE public.indicator_moyens ADD COLUMN IF NOT EXISTS responsable_user_id uuid;
ALTER TABLE public.context_issue_actions ADD COLUMN IF NOT EXISTS responsable_user_id uuid;
ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS responsable_user_id uuid;
ALTER TABLE public.quality_objectives ADD COLUMN IF NOT EXISTS responsable_user_id uuid;
ALTER TABLE public.review_decisions ADD COLUMN IF NOT EXISTS responsable_user_id uuid;
ALTER TABLE public.process_tasks ADD COLUMN IF NOT EXISTS responsable_user_id uuid;

-- Backfill for single-profile acteurs
UPDATE public.risk_actions ra SET responsable_user_id = p.id
FROM public.profiles p
WHERE ra.responsable IS NOT NULL AND ra.responsable != '' AND ra.responsable = p.acteur_id::text
AND ra.responsable_user_id IS NULL
AND (SELECT count(*) FROM public.profiles WHERE acteur_id = p.acteur_id AND actif = true) = 1;

UPDATE public.risk_moyens rm SET responsable_user_id = p.id
FROM public.profiles p
WHERE rm.responsable IS NOT NULL AND rm.responsable != '' AND rm.responsable = p.acteur_id::text
AND rm.responsable_user_id IS NULL
AND (SELECT count(*) FROM public.profiles WHERE acteur_id = p.acteur_id AND actif = true) = 1;

UPDATE public.indicator_actions ia SET responsable_user_id = p.id
FROM public.profiles p
WHERE ia.responsable IS NOT NULL AND ia.responsable != '' AND ia.responsable = p.acteur_id::text
AND ia.responsable_user_id IS NULL
AND (SELECT count(*) FROM public.profiles WHERE acteur_id = p.acteur_id AND actif = true) = 1;

UPDATE public.indicator_moyens im SET responsable_user_id = p.id
FROM public.profiles p
WHERE im.responsable IS NOT NULL AND im.responsable != '' AND im.responsable = p.acteur_id::text
AND im.responsable_user_id IS NULL
AND (SELECT count(*) FROM public.profiles WHERE acteur_id = p.acteur_id AND actif = true) = 1;

UPDATE public.context_issue_actions cia SET responsable_user_id = p.id
FROM public.profiles p
WHERE cia.responsable IS NOT NULL AND cia.responsable != '' AND cia.responsable = p.acteur_id::text
AND cia.responsable_user_id IS NULL
AND (SELECT count(*) FROM public.profiles WHERE acteur_id = p.acteur_id AND actif = true) = 1;

UPDATE public.actions a SET responsable_user_id = p.id
FROM public.profiles p
WHERE a.responsable_id IS NOT NULL AND a.responsable_id = p.acteur_id
AND a.responsable_user_id IS NULL
AND (SELECT count(*) FROM public.profiles WHERE acteur_id = p.acteur_id AND actif = true) = 1;

UPDATE public.quality_objectives qo SET responsable_user_id = p.id
FROM public.profiles p
WHERE qo.responsable_id IS NOT NULL AND qo.responsable_id = p.acteur_id
AND qo.responsable_user_id IS NULL
AND (SELECT count(*) FROM public.profiles WHERE acteur_id = p.acteur_id AND actif = true) = 1;

UPDATE public.review_decisions rd SET responsable_user_id = p.id
FROM public.profiles p
WHERE rd.responsable_id IS NOT NULL AND rd.responsable_id = p.acteur_id
AND rd.responsable_user_id IS NULL
AND (SELECT count(*) FROM public.profiles WHERE acteur_id = p.acteur_id AND actif = true) = 1;

UPDATE public.process_tasks pt SET responsable_user_id = p.id
FROM public.profiles p
WHERE pt.responsable_id IS NOT NULL AND pt.responsable_id = p.acteur_id
AND pt.responsable_user_id IS NULL
AND (SELECT count(*) FROM public.profiles WHERE acteur_id = p.acteur_id AND actif = true) = 1;
