
-- Custom roles table
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL UNIQUE,
  description text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_roles_select" ON public.custom_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_roles_insert_admin" ON public.custom_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "custom_roles_update_admin" ON public.custom_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "custom_roles_delete_admin" ON public.custom_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Custom role permissions table
CREATE TABLE public.custom_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_read boolean NOT NULL DEFAULT false,
  can_read_detail boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(custom_role_id, module)
);

ALTER TABLE public.custom_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crp_select" ON public.custom_role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "crp_insert_admin" ON public.custom_role_permissions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "crp_update_admin" ON public.custom_role_permissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "crp_delete_admin" ON public.custom_role_permissions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- User custom roles assignment table
CREATE TABLE public.user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  custom_role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, custom_role_id)
);

ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ucr_select" ON public.user_custom_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ucr_insert_admin" ON public.user_custom_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "ucr_update_admin" ON public.user_custom_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "ucr_delete_admin" ON public.user_custom_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
