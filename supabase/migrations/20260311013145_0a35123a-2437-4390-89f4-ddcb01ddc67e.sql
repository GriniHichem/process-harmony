
-- Create acteur_groups table
CREATE TABLE public.acteur_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add group_id to acteurs
ALTER TABLE public.acteurs ADD COLUMN group_id UUID REFERENCES public.acteur_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.acteur_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for acteur_groups
CREATE POLICY "acteur_groups_select" ON public.acteur_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "acteur_groups_insert_admin" ON public.acteur_groups FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "acteur_groups_update_admin" ON public.acteur_groups FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "acteur_groups_delete_admin" ON public.acteur_groups FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "acteur_groups_insert_rmq" ON public.acteur_groups FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "acteur_groups_update_rmq" ON public.acteur_groups FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));
CREATE POLICY "acteur_groups_delete_rmq" ON public.acteur_groups FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'::app_role));
