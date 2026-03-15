-- ============================================================
-- DIAGNOSTIC DE SÉCURITÉ — Q-Process
-- Script en lecture seule — ne modifie rien
-- À exécuter dans psql, Supabase Studio SQL Editor, ou pgAdmin
-- ============================================================

-- ============================================================
-- SECTION 1 : ENUM app_role
-- ============================================================
SELECT '=== 1. ENUM app_role ===' AS section;

SELECT 
  enum_range(NULL::app_role) AS valeurs_actuelles,
  ARRAY['super_admin','admin','rmq','responsable_processus','consultant','auditeur','acteur']::text[] AS valeurs_attendues;

-- Vérifier les valeurs manquantes
SELECT unnest(ARRAY['super_admin','admin','rmq','responsable_processus','consultant','auditeur','acteur']) AS valeur_attendue,
       unnest(ARRAY['super_admin','admin','rmq','responsable_processus','consultant','auditeur','acteur'])::text 
         IN (SELECT unnest(enum_range(NULL::app_role))::text) AS presente;

-- ============================================================
-- SECTION 2 : TABLE user_roles
-- ============================================================
SELECT '=== 2. TABLE user_roles ===' AS section;

-- Existence et RLS
SELECT 
  tablename,
  rowsecurity AS rls_active
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_roles';

-- Contenu actuel
SELECT 
  ur.user_id,
  ur.role,
  p.email,
  p.nom,
  p.prenom
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
ORDER BY ur.role, p.email;

-- ============================================================
-- SECTION 3 : TABLE profiles
-- ============================================================
SELECT '=== 3. TABLE profiles ===' AS section;

-- Existence et RLS
SELECT 
  tablename,
  rowsecurity AS rls_active
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Nombre de profils
SELECT COUNT(*) AS nombre_profils FROM public.profiles;

-- Profils sans rôle associé
SELECT 
  p.id,
  p.email,
  p.nom
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.id IS NULL;

-- ============================================================
-- SECTION 4 : POLICIES RLS sur user_roles
-- ============================================================
SELECT '=== 4. POLICIES sur user_roles ===' AS section;

SELECT 
  policyname,
  cmd AS operation,
  roles,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- ============================================================
-- SECTION 5 : POLICIES RLS sur profiles
-- ============================================================
SELECT '=== 5. POLICIES sur profiles ===' AS section;

SELECT 
  policyname,
  cmd AS operation,
  roles,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================================
-- SECTION 6 : FONCTIONS SECURITY DEFINER
-- ============================================================
SELECT '=== 6. FONCTIONS critiques ===' AS section;

SELECT 
  proname AS nom_fonction,
  prosecdef AS security_definer,
  provolatile AS volatilite,
  lanname AS langage
FROM pg_proc 
JOIN pg_language ON pg_proc.prolang = pg_language.oid
WHERE proname IN ('has_role', 'get_user_role', 'handle_new_user', 
                  'notify_responsibility_change', 'resolve_notification_channel',
                  'dispatch_notification_email', 'log_audit_event')
ORDER BY proname;

-- Vérifier que has_role existe et fonctionne
SELECT '=== 6b. Test has_role() ===' AS section;
SELECT 
  'has_role existe' AS test,
  EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'has_role'
  ) AS resultat;

-- ============================================================
-- SECTION 7 : TRIGGER on_auth_user_created
-- ============================================================
SELECT '=== 7. TRIGGER on_auth_user_created ===' AS section;

SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Autres triggers importants
SELECT '=== 7b. Autres triggers critiques ===' AS section;

SELECT 
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name IN (
  'dispatch_email_on_notification',
  'notify_actions_responsibility',
  'notify_process_tasks_responsibility',
  'notify_processes_responsibility'
)
ORDER BY trigger_name;

-- ============================================================
-- SECTION 8 : VÉRIFICATION ADMIN/SUPER_ADMIN
-- ============================================================
SELECT '=== 8. Utilisateurs admin/super_admin ===' AS section;

SELECT 
  ur.user_id,
  ur.role,
  p.email,
  p.nom,
  p.prenom,
  p.actif
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role IN ('admin', 'super_admin')
ORDER BY ur.role, p.email;

-- ============================================================
-- SECTION 9 : TABLE app_settings (config SMTP)
-- ============================================================
SELECT '=== 9. Configuration app_settings ===' AS section;

SELECT 
  key,
  CASE 
    WHEN key IN ('smtp_password', 'supabase_service_role_key') THEN '********' 
    ELSE LEFT(value, 50) 
  END AS valeur_masquee,
  updated_at
FROM public.app_settings
ORDER BY key;

-- ============================================================
-- SECTION 10 : EXTENSIONS
-- ============================================================
SELECT '=== 10. Extensions critiques ===' AS section;

SELECT 
  extname,
  extversion
FROM pg_extension 
WHERE extname IN ('pg_net', 'pgcrypto', 'uuid-ossp', 'pgjwt')
ORDER BY extname;

-- ============================================================
-- SECTION 11 : RÉSUMÉ FINAL
-- ============================================================
SELECT '=== RÉSUMÉ FINAL ===' AS section;

SELECT 'enum_app_role' AS verification, 
  (SELECT array_length(enum_range(NULL::app_role), 1) = 7)::text AS resultat
UNION ALL
SELECT 'table_user_roles_rls', 
  (SELECT rowsecurity::text FROM pg_tables WHERE tablename = 'user_roles')
UNION ALL
SELECT 'table_profiles_rls', 
  (SELECT rowsecurity::text FROM pg_tables WHERE tablename = 'profiles')
UNION ALL
SELECT 'fn_has_role', 
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'has_role')::text
UNION ALL
SELECT 'fn_get_user_role', 
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_user_role')::text
UNION ALL
SELECT 'fn_handle_new_user', 
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')::text
UNION ALL
SELECT 'trigger_on_auth_user_created', 
  EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')::text
UNION ALL
SELECT 'extension_pg_net', 
  EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net')::text
UNION ALL
SELECT 'au_moins_1_admin', 
  EXISTS(SELECT 1 FROM public.user_roles WHERE role IN ('admin', 'super_admin'))::text;
