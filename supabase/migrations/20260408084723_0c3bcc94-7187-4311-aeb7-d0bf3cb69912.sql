ALTER TABLE process_elements ADD COLUMN responsable_id uuid REFERENCES acteurs(id) ON DELETE SET NULL;

CREATE TABLE process_element_attentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id uuid NOT NULL REFERENCES process_elements(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  date_prevue date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE process_element_attentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON process_element_attentes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);