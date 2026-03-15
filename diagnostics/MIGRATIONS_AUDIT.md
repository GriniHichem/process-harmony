# 🔍 Audit des Migrations SQL — Q-Process

## Résumé

Le projet contient **61 fichiers de migration** dans `supabase/migrations/`.
Les migrations sont exécutées dans l'ordre alphabétique du nom de fichier (= ordre chronologique par timestamp `YYYYMMDDHHMMSS`).

---

## Ordre d'exécution et objets créés

### Migration 1 — `20260304080938` (Schéma initial complet)
**Objets créés dans l'ordre :**
1. ✅ `app_role` ENUM — valeurs initiales : `rmq`, `responsable_processus`, `consultant`, `auditeur`
2. ✅ Autres ENUMs : `process_type`, `process_status`, `document_type`, `audit_type`, `audit_status`, `finding_type`, `nc_severity`, `nc_status`, `action_type`, `action_status`, `risk_type`, `indicator_frequency`
3. ✅ Fonction `update_updated_at_column()`
4. ✅ Table `profiles` (RLS activé)
5. ✅ Table `user_roles` (RLS activé)
6. ✅ Fonction `has_role()` — SECURITY DEFINER ← **créée AVANT les policies** ✅
7. ✅ Fonction `get_user_role()` — SECURITY DEFINER
8. ✅ Tables métier : `processes`, `process_versions`, `bpmn_diagrams`, `documents`, `indicators`, `indicator_values`, `risks_opportunities`, `audits`, `audit_findings`, `nonconformities`, `actions`, `audit_logs`
9. ✅ Bucket storage `documents`
10. ✅ Triggers `update_*_updated_at` sur toutes les tables
11. ✅ Fonction `handle_new_user()` — SECURITY DEFINER
12. ✅ Trigger `on_auth_user_created` sur `auth.users`
13. ✅ Policies RLS sur toutes les tables (utilisent `has_role()` — déjà créée) ✅

**⚠️ Constat important :** La migration initiale est correctement ordonnée. `has_role()` est définie AVANT toutes les policies qui l'utilisent.

### Migration 2 — `20260304080950` (Correction policies)
- DROP + recréation de `process_versions_insert` et `audit_logs_insert`
- Dépend de `has_role()` ✅ (déjà créée en migration 1)

### Migration 3 — `20260304084219` (Process elements)
- Crée ENUM `process_element_type`
- Crée table `process_elements` avec RLS
- Policies utilisent `has_role()` ✅

### Migration 4 — `20260304094307` (Update handle_new_user)
- Recrée `handle_new_user()` pour ajouter le champ `fonction`
- Pas de dépendance problématique ✅

### Migrations 5-8 — `20260310144738` à `20260310175936`
- **`20260310173533`** : ⭐ `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin'`
- Ajouts de tables, colonnes, features métier

### Migrations 9-21 — `20260310182749` à `20260311040902`
- Ajouts de tables : `acteurs`, `acteur_groups`, `process_tasks`, `process_interactions`, `document_processes`, etc.
- **`20260311000804`** : ⭐ `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'acteur'`
- Création de policies supplémentaires (toutes utilisent `has_role()` ✅)
- Ajout ENUM `task_flow_type`, `acteur_type`, `context_issue_type`, `impact_level`, `indicator_type`

### Migrations 22-38 — `20260311114213` à `20260312022741`
- Tables : `quality_objectives`, `management_reviews`, `review_decisions`, `review_input_items`
- Tables sondages : `client_surveys`, `client_survey_questions`, `client_survey_responses`, `client_survey_answers`
- Tables : `competences`, `formations`, `formation_participants`, `budget_formation`
- Tables : `action_notes`, `element_notes`
- Tables : `custom_roles`, `custom_role_permissions`
- Policies RLS sur toutes les nouvelles tables ✅

### Migrations 39-41 — `20260314023506` à `20260314191944`
- **`20260314023506`** : ⭐ `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin'`
- **`20260314023521`** : Ajout policies admin/super_admin sur `user_roles`
  - `"Admins can manage all roles"` — utilise `has_role(auth.uid(), 'admin')` et `has_role(auth.uid(), 'super_admin')` ✅
- Ajout table `app_settings`, `notification_preferences`, `notifications`

### Migrations 42-55 — `20260314192624` à `20260315103937`
- Tables : `notification_config`, `client_survey_shares`, `client_survey_comments`
- Fonction `notify_responsibility_change()` — SECURITY DEFINER
- Fonction `resolve_notification_channel()` — SECURITY DEFINER
- Trigger `dispatch_email_on_notification` sur `notifications`
- Fonction `dispatch_notification_email()` — SECURITY DEFINER (utilise `pg_net` et `app_settings`)
- Bucket storage `survey-images`, `branding`
- Policies anon sur tables sondages (accès public)

### Migrations 56-60 — `20260315110616` à `20260315111634`
- Ajustements policies, colonnes additionnelles
- Trigger `log_audit_event()` sur tables critiques

### Migration 61 — `20260315122218` (Consolidation enum)
- ⭐ Script DO $$ qui vérifie/ajoute TOUTES les valeurs de `app_role` :
  - `super_admin`, `admin`, `rmq`, `responsable_processus`, `consultant`, `auditeur`, `acteur`
- Recrée `has_role()`, `get_user_role()`, `handle_new_user()` avec les signatures actuelles
- Recrée les policies admin/super_admin sur `user_roles`
- **Rôle** : migration de consolidation/réparation — assure la cohérence même si des migrations précédentes ont échoué

---

## Vérification des dépendances critiques

### ✅ `has_role()` créée avant usage
- **Définie** : Migration 1 (`20260304080938`) — ligne 53
- **Premier usage** : Migration 1 (`20260304080938`) — ligne 315 (policies)
- **Résultat** : ✅ Ordre correct dans la même migration

### ✅ `get_user_role()` créée avant usage
- **Définie** : Migration 1 (`20260304080938`) — ligne 67
- **Usage** : Côté frontend uniquement (pas dans d'autres migrations)
- **Résultat** : ✅ OK

### ✅ `handle_new_user()` et trigger `on_auth_user_created`
- **Fonction définie** : Migration 1 (`20260304080938`) — ligne 286
- **Trigger créé** : Migration 1 (`20260304080938`) — ligne 306
- **Mise à jour** : Migration 4 (`20260304094307`) — ajoute `fonction`
- **Résultat** : ✅ Ordre correct

### ✅ Enum `app_role` — évolution
| Migration | Valeur ajoutée |
|---|---|
| `20260304080938` | `rmq`, `responsable_processus`, `consultant`, `auditeur` (création initiale) |
| `20260310173533` | `admin` |
| `20260311000804` | `acteur` |
| `20260314023506` | `super_admin` |
| `20260315122218` | Consolidation : vérifie les 7 valeurs |

**Résultat** : ✅ Toutes les valeurs sont présentes après exécution complète

---

## ⚠️ Points de vigilance

### 1. Migration 1 — Bucket storage
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
```
- **Risque** : Si le bucket existe déjà (re-exécution), cette ligne échouera
- **Impact** : Peut bloquer toute la migration 1 si exécutée deux fois
- **Recommandation** : Utiliser `INSERT ... ON CONFLICT DO NOTHING`

### 2. Trigger `on_auth_user_created` sur `auth.users`
- Ce trigger est attaché au schéma `auth` (schéma réservé Supabase)
- **Risque en self-hosted** : Si le schéma `auth` n'est pas initialisé avant les migrations, le trigger échouera
- **En Supabase Cloud/CLI** : Pas de problème — `auth.users` existe par défaut

### 3. Extension `pg_net`
- La migration `20260315095840` exécute `CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions`
- **Risque en self-hosted** : `pg_net` n'est pas une extension PostgreSQL standard — elle est spécifique à Supabase
- **Impact** : La fonction `dispatch_notification_email()` ne pourra pas envoyer d'emails via trigger si `pg_net` est absente

### 4. Fonction `dispatch_notification_email()` — dépendance `app_settings`
- Cette fonction lit `supabase_url` et `supabase_service_role_key` depuis `app_settings`
- **Ces valeurs sont injectées par** `check-deadlines` Edge Function (auto-configuration)
- **Risque** : Si `check-deadlines` n'a jamais été exécuté, les clés `supabase_url` et `supabase_service_role_key` seront absentes de `app_settings`, et le dispatch email échouera silencieusement

### 5. Policies qui référencent `has_role()` avec des rôles ajoutés plus tard
- Certaines policies dans les migrations tardives utilisent `has_role(auth.uid(), 'admin')` ou `has_role(auth.uid(), 'super_admin')`
- **Pas de problème technique** : `has_role()` accepte le type `app_role`, et les valeurs enum sont ajoutées via `ALTER TYPE ... ADD VALUE IF NOT EXISTS` dans des migrations antérieures
- **Mais** : Si les migrations `20260310173533` (admin) ou `20260314023506` (super_admin) ne s'exécutent pas, les policies referencing ces rôles ne pourront pas matcher

---

## Résumé de cohérence

| Vérification | Résultat |
|---|---|
| `has_role()` créée avant les policies | ✅ OK |
| `get_user_role()` créée avant usage | ✅ OK |
| `handle_new_user()` créée avant trigger | ✅ OK |
| `on_auth_user_created` correctement attaché | ✅ OK |
| Enum contient les 7 valeurs requises | ✅ OK (après migration 61) |
| Ordre des dépendances respecté | ✅ OK |
| Risque de re-exécution (bucket INSERT) | ⚠️ Peut échouer |
| Dépendance `pg_net` (self-hosted) | ⚠️ Peut manquer |
| Auto-config `app_settings` pour dispatch | ⚠️ Dépend de `check-deadlines` |
