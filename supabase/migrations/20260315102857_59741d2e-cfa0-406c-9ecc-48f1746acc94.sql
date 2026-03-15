
-- Add profile_id to competences
ALTER TABLE public.competences ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add profile_id and cout to formations
ALTER TABLE public.formations ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.formations ADD COLUMN IF NOT EXISTS cout numeric NOT NULL DEFAULT 0;

-- Create budget_formation table
CREATE TABLE IF NOT EXISTS public.budget_formation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annee integer NOT NULL UNIQUE,
  budget_prevu numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for budget_formation
ALTER TABLE public.budget_formation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read budget_formation"
  ON public.budget_formation FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and RMQ can manage budget_formation"
  ON public.budget_formation FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rmq')
  );

-- Updated_at trigger for budget_formation
CREATE TRIGGER update_budget_formation_updated_at
  BEFORE UPDATE ON public.budget_formation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
