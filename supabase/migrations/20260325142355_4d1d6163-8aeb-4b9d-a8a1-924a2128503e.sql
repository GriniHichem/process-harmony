
-- Consolidation fix: get_user_role must use DROP+CREATE because return type matches existing
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
CREATE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;
