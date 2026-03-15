# ⚡ Audit des Edge Functions — Q-Process

## Vue d'ensemble

Le projet contient **7 Edge Functions** dans `supabase/functions/`.

Aucun fichier `config.toml` local aux fonctions ne définit `verify_jwt`. Par défaut, Supabase exige un JWT valide pour toutes les Edge Functions (`verify_jwt = true` par défaut).

---

## Analyse détaillée

### 1. `admin-create-user`

| Propriété | Valeur |
|---|---|
| **Rôle** | Création d'un compte utilisateur par un admin |
| **Auth JWT requise** | ✅ Oui — vérifie le header `Authorization` |
| **Rôle exigé** | `admin` ou `super_admin` (via `has_role()` RPC) |
| **Variables d'env** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tables accédées** | `auth.users` (admin API), `user_roles` (RPC has_role) |
| **verify_jwt recommandé** | `true` |
| **Risques d'échec** | Variables d'env manquantes → 500 ; Token expiré → 401 ; Rôle manquant → 403 ; `has_role()` absente → 500 |

---

### 2. `admin-reset-password`

| Propriété | Valeur |
|---|---|
| **Rôle** | Réinitialisation du mot de passe d'un utilisateur par un admin |
| **Auth JWT requise** | ✅ Oui — vérifie le header `Authorization` |
| **Rôle exigé** | `admin` ou `super_admin` (via `has_role()` RPC) |
| **Variables d'env** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tables accédées** | `auth.users` (admin API), `user_roles` (RPC has_role) |
| **verify_jwt recommandé** | `true` |
| **Risques d'échec** | Identiques à `admin-create-user` |

---

### 3. `admin-save-smtp-password`

| Propriété | Valeur |
|---|---|
| **Rôle** | Sauvegarde sécurisée du mot de passe SMTP dans `app_settings` |
| **Auth JWT requise** | ✅ Oui — vérifie le header `Authorization` |
| **Rôle exigé** | `super_admin` uniquement |
| **Variables d'env** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tables accédées** | `user_roles` (vérification rôle), `app_settings` (upsert) |
| **verify_jwt recommandé** | `true` |
| **Risques d'échec** | Variables d'env manquantes ; Table `app_settings` inexistante ; Rôle super_admin absent ; Enum `super_admin` non ajoutée |

---

### 4. `send-test-email`

| Propriété | Valeur |
|---|---|
| **Rôle** | Envoi d'un email de test pour valider la configuration SMTP |
| **Auth JWT requise** | ✅ Oui — vérifie le header `Authorization` |
| **Rôle exigé** | `super_admin` uniquement |
| **Variables d'env** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tables accédées** | `user_roles` (vérification rôle), `app_settings` (lecture SMTP) |
| **verify_jwt recommandé** | `true` |
| **Risques d'échec** | Config SMTP incomplète (smtp_host, smtp_user, smtp_password manquants) ; Port 465 → TLS direct ; Serveur SMTP inaccessible ; Firewall bloquant le port |
| **Bibliothèque** | `denomailer@1.6.0` |

---

### 5. `send-notification-email`

| Propriété | Valeur |
|---|---|
| **Rôle** | Envoi d'emails de notification aux utilisateurs (assignations, échéances, retards, changements de statut) |
| **Auth JWT requise** | ⚠️ Non vérifié dans le code — mais appelé par `dispatch_notification_email()` trigger avec le `SUPABASE_SERVICE_ROLE_KEY` comme Bearer token |
| **Rôle exigé** | Aucun (appelé par le système) |
| **Variables d'env** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tables accédées** | `app_settings` (SMTP + config), `profiles` (email utilisateur), tables métier (détails entité), `notifications` (update email_sent) |
| **verify_jwt recommandé** | `false` — car appelé par trigger DB via `pg_net`, pas par un utilisateur. Alternativement `true` si le service_role_key est passé en Bearer |
| **Risques d'échec** | Config SMTP incomplète ; `pg_net` absent → trigger ne peut pas appeler la fonction ; `app_settings` vide |
| **Bibliothèque** | `denomailer@1.6.0` |

---

### 6. `send-survey-copy`

| Propriété | Valeur |
|---|---|
| **Rôle** | Envoi d'une copie des réponses de sondage au répondant par email |
| **Auth JWT requise** | ❌ Non — aucune vérification d'auth dans le code |
| **Rôle exigé** | Aucun (accessible publiquement) |
| **Variables d'env** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tables accédées** | `app_settings` (SMTP config) |
| **verify_jwt recommandé** | `false` — car utilisé par des répondants anonymes de sondages |
| **Risques d'échec** | Config SMTP incomplète ; Adresse email invalide ; Serveur SMTP inaccessible |
| **Bibliothèque** | `denomailer@1.6.0` |

**⚠️ Point de vigilance** : Actuellement `verify_jwt` n'est PAS configuré explicitement à `false` dans `config.toml`. Par défaut Supabase exige un JWT → cette fonction échouera pour les utilisateurs anonymes si `verify_jwt` n'est pas désactivé.

---

### 7. `check-deadlines`

| Propriété | Valeur |
|---|---|
| **Rôle** | Scan quotidien des échéances et création de notifications retard/rappel |
| **Auth JWT requise** | ❌ Non — utilise directement le service_role_key |
| **Rôle exigé** | Aucun (tâche système/cron) |
| **Variables d'env** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tables accédées** | `app_settings` (config + auto-insertion supabase_url/service_role_key), `notification_preferences`, `notification_config`, `profiles`, `notifications`, + 8 tables métier (actions, quality_objectives, review_decisions, risk_actions, risk_moyens, indicator_actions, indicator_moyens, context_issue_actions) |
| **verify_jwt recommandé** | `false` — car appelé par cron, pas par un utilisateur |
| **Risques d'échec** | Tables métier inexistantes ; `notification_config` vide → fallback `both` ; Pas de profils liés aux acteurs |
| **Note** | Auto-configure `app_settings` avec `supabase_url` et `supabase_service_role_key` à chaque exécution |

**⚠️ Point de vigilance** : Cette fonction écrit le `SUPABASE_SERVICE_ROLE_KEY` dans `app_settings` (table accessible via RLS). Vérifier que les policies RLS sur `app_settings` ne permettent pas la lecture de cette clé par des utilisateurs non autorisés.

---

## Tableau récapitulatif

| Fonction | Auth | Rôle requis | verify_jwt | Env critiques |
|---|---|---|---|---|
| `admin-create-user` | ✅ JWT | admin/super_admin | `true` | URL, SERVICE_ROLE_KEY |
| `admin-reset-password` | ✅ JWT | admin/super_admin | `true` | URL, SERVICE_ROLE_KEY |
| `admin-save-smtp-password` | ✅ JWT | super_admin | `true` | URL, ANON_KEY, SERVICE_ROLE_KEY |
| `send-test-email` | ✅ JWT | super_admin | `true` | URL, ANON_KEY, SERVICE_ROLE_KEY |
| `send-notification-email` | ⚠️ Non | système | `false` | URL, SERVICE_ROLE_KEY |
| `send-survey-copy` | ❌ Non | aucun | `false` | URL, SERVICE_ROLE_KEY |
| `check-deadlines` | ❌ Non | aucun (cron) | `false` | URL, SERVICE_ROLE_KEY |

---

## Configuration `verify_jwt` requise

Pour les fonctions qui n'exigent PAS de JWT, ajouter dans `supabase/config.toml` :

```toml
[functions.send-notification-email]
verify_jwt = false

[functions.send-survey-copy]
verify_jwt = false

[functions.check-deadlines]
verify_jwt = false
```

**Sans cette configuration, ces 3 fonctions retourneront une erreur 401 quand appelées sans JWT.**
