
-- ============================================================
-- Process-level permissions system
-- ============================================================

-- 1. process_role_permissions table
CREATE TABLE IF NOT EXISTS public.process_role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role,
  custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_detail BOOLEAN NOT NULL DEFAULT false,
  can_comment BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_version BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_process_role_perm UNIQUE (role, custom_role_id, process_id),
  CONSTRAINT check_role_or_custom CHECK (role IS NOT NULL OR custom_role_id IS NOT NULL)
);

-- updated_at trigger
CREATE TRIGGER update_process_role_permissions_updated_at
  BEFORE UPDATE ON public.process_role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.process_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read process permissions"
  ON public.process_role_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage process permissions"
  ON public.process_role_permissions FOR ALL
  TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
  );

-- 2. process_comments table
CREATE TABLE IF NOT EXISTS public.process_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.process_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read process comments"
  ON public.process_comments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert process comments"
  ON public.process_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage process comments"
  ON public.process_comments FOR ALL
  TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
  );

-- 3. permission_audit_log table
CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  changed_by UUID REFERENCES public.profiles(id),
  target_role app_role,
  target_custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE SET NULL,
  process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL,
  old_perms JSONB,
  new_perms JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read permission audit log"
  ON public.permission_audit_log FOR SELECT
  TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
  );

CREATE POLICY "Admins can insert permission audit log"
  ON public.permission_audit_log FOR INSERT
  TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rmq')
  );

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_process_role_perms_process ON public.process_role_permissions(process_id);
CREATE INDEX IF NOT EXISTS idx_process_role_perms_role ON public.process_role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_process_role_perms_custom ON public.process_role_permissions(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_process ON public.process_comments(process_id);
