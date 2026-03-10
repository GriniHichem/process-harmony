
-- Enum for context issue type
CREATE TYPE public.context_issue_type AS ENUM ('interne', 'externe');

-- Enum for impact level
CREATE TYPE public.impact_level AS ENUM ('faible', 'moyen', 'fort');

-- Main context issues table
CREATE TABLE public.context_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL,
  type_enjeu context_issue_type NOT NULL DEFAULT 'interne',
  intitule TEXT NOT NULL,
  description TEXT DEFAULT '',
  impact impact_level NOT NULL DEFAULT 'moyen',
  climat_pertinent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table: context issue <-> processes (many-to-many)
CREATE TABLE public.context_issue_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context_issue_id UUID NOT NULL REFERENCES public.context_issues(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(context_issue_id, process_id)
);

-- Action plan for context issues
CREATE TABLE public.context_issue_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context_issue_id UUID NOT NULL REFERENCES public.context_issues(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  responsable TEXT DEFAULT '',
  date_revue DATE,
  statut TEXT NOT NULL DEFAULT 'a_faire',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.context_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_issue_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_issue_actions ENABLE ROW LEVEL SECURITY;

-- context_issues policies
CREATE POLICY "ci_select" ON public.context_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "ci_insert" ON public.context_issues FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'rmq') OR has_role(auth.uid(), 'responsable_processus') OR has_role(auth.uid(), 'consultant')
);
CREATE POLICY "ci_insert_admin" ON public.context_issues FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "ci_update" ON public.context_issues FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'rmq') OR has_role(auth.uid(), 'responsable_processus')
);
CREATE POLICY "ci_update_admin" ON public.context_issues FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "ci_delete" ON public.context_issues FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'));
CREATE POLICY "ci_delete_admin" ON public.context_issues FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- context_issue_processes policies
CREATE POLICY "cip_select" ON public.context_issue_processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cip_insert" ON public.context_issue_processes FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'rmq') OR has_role(auth.uid(), 'responsable_processus') OR has_role(auth.uid(), 'consultant')
);
CREATE POLICY "cip_insert_admin" ON public.context_issue_processes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "cip_delete" ON public.context_issue_processes FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'rmq') OR has_role(auth.uid(), 'responsable_processus')
);
CREATE POLICY "cip_delete_admin" ON public.context_issue_processes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- context_issue_actions policies
CREATE POLICY "cia_select" ON public.context_issue_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cia_insert" ON public.context_issue_actions FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'rmq') OR has_role(auth.uid(), 'responsable_processus') OR has_role(auth.uid(), 'consultant')
);
CREATE POLICY "cia_insert_admin" ON public.context_issue_actions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "cia_update" ON public.context_issue_actions FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'rmq') OR has_role(auth.uid(), 'responsable_processus')
);
CREATE POLICY "cia_update_admin" ON public.context_issue_actions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "cia_delete" ON public.context_issue_actions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'rmq'));
CREATE POLICY "cia_delete_admin" ON public.context_issue_actions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
