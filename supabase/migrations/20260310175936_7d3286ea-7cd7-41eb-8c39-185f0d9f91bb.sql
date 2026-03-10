
-- Create enum for task flow types
CREATE TYPE public.task_flow_type AS ENUM ('sequentiel', 'conditionnel', 'parallele', 'inclusif');

-- Create process_tasks table
CREATE TABLE public.process_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL DEFAULT '',
  type_flux task_flow_type NOT NULL DEFAULT 'sequentiel',
  condition text,
  parent_code text,
  responsable_id uuid REFERENCES public.acteurs(id) ON DELETE SET NULL,
  ordre integer NOT NULL DEFAULT 0,
  entrees text DEFAULT '',
  sorties text DEFAULT '',
  documents text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.process_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as process_elements)
CREATE POLICY "process_tasks_select" ON public.process_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "process_tasks_insert" ON public.process_tasks FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'responsable_processus'::app_role)
    OR has_role(auth.uid(), 'consultant'::app_role)
  );

CREATE POLICY "process_tasks_insert_admin" ON public.process_tasks FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "process_tasks_update" ON public.process_tasks FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'rmq'::app_role)
    OR has_role(auth.uid(), 'responsable_processus'::app_role)
    OR has_role(auth.uid(), 'consultant'::app_role)
  );

CREATE POLICY "process_tasks_update_admin" ON public.process_tasks FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "process_tasks_delete" ON public.process_tasks FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'rmq'::app_role));

CREATE POLICY "process_tasks_delete_admin" ON public.process_tasks FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_process_tasks_updated_at
  BEFORE UPDATE ON public.process_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
