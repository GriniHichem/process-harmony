
-- Table for collective formation participants (many-to-many)
CREATE TABLE public.formation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  acteur_id uuid NOT NULL REFERENCES public.acteurs(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.formation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fp_select" ON public.formation_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "fp_insert" ON public.formation_participants FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "fp_update" ON public.formation_participants FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "fp_delete" ON public.formation_participants FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'rmq'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Replace single competence_liee with array for multiple competences
ALTER TABLE public.formations ADD COLUMN IF NOT EXISTS competences_liees text[] DEFAULT '{}';

-- Migrate existing data
UPDATE public.formations SET competences_liees = ARRAY[competence_liee] WHERE competence_liee IS NOT NULL AND competence_liee != '' AND (competences_liees IS NULL OR competences_liees = '{}');
