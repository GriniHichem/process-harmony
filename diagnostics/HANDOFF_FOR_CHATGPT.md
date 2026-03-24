# 🤝 HANDOFF TECHNIQUE — Q-Process (ISO 9001)

> Ce document est destiné à un assistant technique qui doit diagnostiquer et résoudre des problèmes de déploiement/migration sur un serveur Ubuntu.

---

## 1. Résumé de l'architecture

**Q-Process** est une application de gestion qualité ISO 9001 composée de :

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend** : Supabase (PostgreSQL + GoTrue Auth + PostgREST + Edge Functions Deno)
- **SMTP custom** : Envoi d'emails via `denomailer` (bibliothèque Deno), configuration stockée en base dans `app_settings`
- **61 migrations SQL** dans `supabase/migrations/`
- **7 Edge Functions** dans `supabase/functions/`
- **3 storage buckets** : `documents` (privé), `survey-images` (public), `branding` (public)

Le projet a été développé avec **Supabase Cloud**. Il n'y a PAS de `docker-compose.yml` dans le repo. Pour un déploiement sur serveur Ubuntu, il faut soit :
1. Utiliser le **Supabase CLI** (`supabase start`) avec Docker
2. Installer la **stack Supabase self-hosted** séparément

---

## 2. Problèmes probables

### Problème 1 : `Edge Function returned a non-2xx status code`
- **Cause la plus probable** : Variables d'environnement `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` non disponibles dans le runtime des Edge Functions
- **Cause secondaire** : La fonction `has_role()` n'existe pas en base (migrations non exécutées)
- **Cause tertiaire** : Token JWT expiré ou absent

### Problème 2 : `has_role() does not exist`
- **Cause** : Les migrations SQL n'ont pas été exécutées dans l'ordre, ou la migration initiale a échoué
- **Vérification** : `SELECT proname FROM pg_proc WHERE proname = 'has_role'`

### Problème 3 : Fonctions `send-survey-copy`, `check-deadlines`, `send-notification-email` → 401
- **Cause** : Ces fonctions ne vérifient PAS le JWT dans leur code, mais Supabase exige un JWT par défaut (`verify_jwt = true`)
- **Solution** : Ajouter dans `supabase/config.toml` :
  ```toml
  [functions.send-survey-copy]
  verify_jwt = false
  
  [functions.check-deadlines]
  verify_jwt = false
  
  [functions.send-notification-email]
  verify_jwt = false
  ```

### Problème 4 : Emails de notification non envoyés automatiquement
- **Cause** : Le trigger `dispatch_notification_email()` utilise l'extension `pg_net` pour faire un appel HTTP vers l'Edge Function
- `pg_net` est spécifique à Supabase Cloud — elle peut être absente en self-hosted
- De plus, le trigger lit `supabase_url` et `supabase_service_role_key` depuis la table `app_settings` — ces valeurs sont auto-insérées par `check-deadlines` lors de sa première exécution

### Problème 5 : SMTP ne fonctionne pas
- **Cause** : Configuration SMTP incomplète dans `app_settings`
- **Vérification** : `SELECT key, value FROM app_settings WHERE key LIKE 'smtp%'`
- Port 465 est traité en TLS direct (correct). Port 587 avec `tls: false` dépend du support STARTTLS de denomailer

---

## 3. Fichiers clés à lire en priorité

### Ordre recommandé de lecture :
1. `supabase/migrations/20260304080938_*.sql` — **Schéma initial complet** (enum, tables, fonctions, trigger, policies)
2. `supabase/functions/admin-create-user/index.ts` — Modèle d'Edge Function avec auth + role check
3. `supabase/functions/send-notification-email/index.ts` — Logique SMTP + template email
4. `supabase/functions/check-deadlines/index.ts` — Auto-config app_settings + scan échéances
5. `supabase/functions/send-survey-copy/index.ts` — Fonction sans auth (public)
6. `src/contexts/AuthContext.tsx` — Logique auth frontend
7. `src/components/RoleGuard.tsx` — Contrôle d'accès frontend
8. `supabase/config.toml` — Configuration projet (actuellement minimale)

---

## 4. Ordre recommandé de correction

1. **Vérifier que PostgreSQL est accessible** et que les migrations ont été exécutées :
   ```bash
   supabase db reset  # ou exécuter les migrations manuellement
   ```

2. **Vérifier l'existence des objets critiques** en exécutant `diagnostics/sql/security_diagnostics.sql`

3. **Configurer les variables d'environnement des Edge Functions** :
   - Créer `supabase/functions/.env` avec `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

4. **Configurer `verify_jwt = false`** pour les 3 fonctions publiques/système dans `supabase/config.toml`

5. **Assigner un rôle admin** au premier utilisateur :
   ```sql
   INSERT INTO public.user_roles (user_id, role) 
   VALUES ('<UUID>', 'super_admin') ON CONFLICT DO NOTHING;
   ```

6. **Exécuter `check-deadlines` une fois** pour auto-configurer `app_settings` avec les clés Supabase

7. **Configurer le SMTP** via l'interface Super Admin

8. **Tester l'envoi d'email** via la fonction de test dans Super Admin

---

## 5. Points de vigilance

### ⚠️ Confirmé / Sûr
- L'ordre des dépendances dans les migrations est correct (`has_role()` définie avant les policies)
- L'enum `app_role` contient les 7 valeurs après exécution complète
- Le trigger `on_auth_user_created` est correctement défini
- Le code SMTP pour le port 465 (TLS direct) est correct

### ⚠️ Risques identifiés
- **`pg_net`** : Extension requise par `dispatch_notification_email()` — peut être absente en self-hosted
- **`storage.buckets` INSERT** dans la migration 1 : échouera si le bucket `documents` existe déjà
- **3 Edge Functions** (`send-survey-copy`, `check-deadlines`, `send-notification-email`) ont besoin de `verify_jwt = false` — NON configuré actuellement
- **`check-deadlines`** écrit le `SUPABASE_SERVICE_ROLE_KEY` dans `app_settings` — vérifier les policies RLS de cette table

### ❓ Incertain
- Le comportement exact de denomailer avec `tls: false` sur le port 587 (STARTTLS automatique ou non) dépend de la version
- La migration initiale insère dans `storage.buckets` — le comportement en self-hosted dépend de l'initialisation du schéma `storage`
- Les policies RLS sur `app_settings` ne sont pas clairement documentées — risque d'exposition du `smtp_password` ou du `supabase_service_role_key` aux utilisateurs authentifiés

---

## 6. Ce qui NE doit PAS être modifié

- Les fichiers de migration existants dans `supabase/migrations/`
- `src/integrations/supabase/client.ts` (auto-généré)
- `src/integrations/supabase/types.ts` (auto-généré)
- `.env` (auto-géré par Lovable Cloud)
- `supabase/config.toml` (sauf pour ajouter `verify_jwt`)
- La logique métier des Edge Functions existantes

---

## 7. Outils de diagnostic fournis

| Outil | Usage |
|---|---|
| `diagnostics/sql/security_diagnostics.sql` | Vérifier tous les objets DB critiques |
| `diagnostics/scripts/check_project_structure.sh` | Vérifier les fichiers présents |
| `diagnostics/scripts/check_supabase_runtime.sh` | Détecter CLI vs Docker |
| `diagnostics/scripts/check_edge_functions_usage.sh` | Analyser les dépendances des Edge Functions |

Exécuter les scripts bash avec `bash diagnostics/scripts/<nom>.sh` depuis la racine du projet.
Exécuter le SQL dans la console PostgreSQL de l'environnement cible.
