
DROP POLICY IF EXISTS "Admin and RMQ can manage budget" ON public.budget_formation;
DROP POLICY IF EXISTS "Authenticated can read budget" ON public.budget_formation;

CREATE POLICY "Authenticated can read budget" ON public.budget_formation
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and RMQ can insert budget" ON public.budget_formation
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'rmq')
);

CREATE POLICY "Admin and RMQ can update budget" ON public.budget_formation
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'rmq')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'rmq')
);

CREATE POLICY "Admin and RMQ can delete budget" ON public.budget_formation
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'rmq')
);
