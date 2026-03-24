ALTER TABLE public.risks_opportunities ADD COLUMN faisabilite integer;

UPDATE public.risks_opportunities SET faisabilite = probabilite WHERE type = 'opportunite' AND probabilite IS NOT NULL;