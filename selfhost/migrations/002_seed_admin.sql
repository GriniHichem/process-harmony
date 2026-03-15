-- ============================================================
-- 002_seed_admin.sql
-- Seed: Assigner le rôle admin/super_admin au premier utilisateur
-- ============================================================
-- 
-- INSTRUCTIONS :
-- 1. Créez d'abord un utilisateur via le Dashboard Supabase (Authentication → Users → Add User)
-- 2. Copiez son UUID
-- 3. Remplacez 'VOTRE-UUID-ICI' ci-dessous par l'UUID copié
-- 4. Exécutez ce script
-- ============================================================

-- Remplacez cette valeur par l'UUID de votre utilisateur admin
DO $$
DECLARE
  admin_uuid uuid := 'VOTRE-UUID-ICI'::uuid;  -- ← MODIFIEZ ICI
BEGIN
  -- Assigner super_admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_uuid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Assigner admin aussi
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_uuid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Rôles super_admin et admin assignés à %', admin_uuid;
END $$;
