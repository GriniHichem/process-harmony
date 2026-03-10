
-- Create actor type enum
CREATE TYPE public.acteur_type AS ENUM ('interne', 'externe');

-- Create acteurs table
CREATE TABLE public.acteurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL DEFAULT '',
  fonction TEXT DEFAULT '',
  organisation TEXT DEFAULT '',
  type_acteur acteur_type NOT NULL DEFAULT 'interne',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.acteurs ENABLE ROW LEVEL SECURITY;

-- All authenticated can read
CREATE POLICY "acteurs_select" ON public.acteurs FOR SELECT TO authenticated USING (true);

-- rmq, responsable_processus, consultant can insert
CREATE POLICY "acteurs_insert" ON public.acteurs FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role) OR has_role(auth.uid(), 'consultant'::app_role));

CREATE POLICY "acteurs_insert_admin" ON public.acteurs FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- rmq, responsable_processus can update
CREATE POLICY "acteurs_update" ON public.acteurs FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'responsable_processus'::app_role));

CREATE POLICY "acteurs_update_admin" ON public.acteurs FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only rmq and admin can delete
CREATE POLICY "acteurs_delete" ON public.acteurs FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'rmq'::app_role));

CREATE POLICY "acteurs_delete_admin" ON public.acteurs FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
