
-- Allow anonymous users to insert survey answers (public survey submission)
CREATE POLICY "Anon can insert survey_answers"
ON public.survey_answers
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to read survey answers (needed for RETURNING clause)
CREATE POLICY "Anon can read survey_answers"
ON public.survey_answers
FOR SELECT
TO anon
USING (true);
