
DROP POLICY IF EXISTS nc_rca_insert ON public.nc_root_cause_analyses;
DROP POLICY IF EXISTS nc_rca_update ON public.nc_root_cause_analyses;
DROP POLICY IF EXISTS nc_rca_delete ON public.nc_root_cause_analyses;

CREATE POLICY "nc_rca_insert" ON public.nc_root_cause_analyses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nc_rca_update" ON public.nc_root_cause_analyses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "nc_rca_delete" ON public.nc_root_cause_analyses FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS nc_actions_insert ON public.nc_actions;
DROP POLICY IF EXISTS nc_actions_update ON public.nc_actions;
DROP POLICY IF EXISTS nc_actions_delete ON public.nc_actions;

CREATE POLICY "nc_actions_insert" ON public.nc_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nc_actions_update" ON public.nc_actions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "nc_actions_delete" ON public.nc_actions FOR DELETE TO authenticated USING (true);
