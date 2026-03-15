CREATE POLICY "csr_select_anon" ON public.client_survey_responses FOR SELECT TO anon USING (true);
CREATE POLICY "csa_select_anon" ON public.client_survey_answers FOR SELECT TO anon USING (true);
CREATE POLICY "csc_select_anon" ON public.client_survey_comments FOR SELECT TO anon USING (true);