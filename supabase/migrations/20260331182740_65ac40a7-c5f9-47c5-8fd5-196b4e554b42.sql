
-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slogan text,
  image_url text,
  description text,
  resources text,
  statut text NOT NULL DEFAULT 'en_cours',
  date_debut date,
  date_fin date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Project <-> Process M2M
CREATE TABLE IF NOT EXISTS public.project_processes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, process_id)
);
ALTER TABLE public.project_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_project_processes" ON public.project_processes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project <-> Acteur M2M
CREATE TABLE IF NOT EXISTS public.project_actors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  acteur_id uuid NOT NULL REFERENCES public.acteurs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, acteur_id)
);
ALTER TABLE public.project_actors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_project_actors" ON public.project_actors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project Actions
CREATE TABLE IF NOT EXISTS public.project_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  responsable_id uuid REFERENCES public.acteurs(id),
  responsable_user_id uuid,
  date_debut date,
  echeance date,
  statut text NOT NULL DEFAULT 'planifiee',
  avancement integer NOT NULL DEFAULT 0,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_project_actions" ON public.project_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_project_actions_updated_at BEFORE UPDATE ON public.project_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_project_actions AFTER INSERT OR UPDATE OR DELETE ON public.project_actions FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Project Tasks
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id uuid NOT NULL REFERENCES public.project_actions(id) ON DELETE CASCADE,
  title text NOT NULL,
  responsable_id uuid REFERENCES public.acteurs(id),
  responsable_user_id uuid,
  date_debut date,
  echeance date,
  statut text NOT NULL DEFAULT 'a_faire',
  avancement integer NOT NULL DEFAULT 0,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_project_tasks" ON public.project_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_project_tasks AFTER INSERT OR UPDATE OR DELETE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
