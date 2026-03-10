CREATE TYPE public.indicator_type AS ENUM ('activite', 'resultat', 'perception', 'interne');

ALTER TABLE public.indicators ADD COLUMN type_indicateur indicator_type NOT NULL DEFAULT 'activite';