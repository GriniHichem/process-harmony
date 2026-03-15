# 📋 Pack de Diagnostic — Q-Process (ISO 9001)

## À quoi sert ce dossier ?

Ce dossier contient des fichiers de documentation et des scripts **en lecture seule** destinés à faciliter l'analyse des problèmes de déploiement, migration, Edge Functions et SMTP sur un serveur Ubuntu.

**Aucun fichier ne modifie, supprime ou écrase quoi que ce soit dans le projet.**

---

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `README.md` | Ce fichier — guide général |
| `ARCHITECTURE_AUDIT.md` | Description de l'architecture réelle du projet |
| `MIGRATIONS_AUDIT.md` | Audit de l'ordre et des dépendances des migrations SQL |
| `EDGE_FUNCTIONS_AUDIT.md` | Analyse de chaque Edge Function (auth, env, tables, risques) |
| `SMTP_AUDIT.md` | Analyse du flux SMTP custom du projet |
| `ENV_REQUIREMENTS.md` | Toutes les variables d'environnement requises (sans secrets) |
| `HANDOFF_FOR_CHATGPT.md` | Synthèse ultra-claire destinée à un autre assistant technique |
| `sql/security_diagnostics.sql` | Script SQL de diagnostic (lecture seule) |
| `scripts/check_project_structure.sh` | Vérifie la présence des fichiers critiques |
| `scripts/check_supabase_runtime.sh` | Détecte si le projet cible Supabase CLI local ou Docker self-hosted |
| `scripts/check_edge_functions_usage.sh` | Liste les Edge Functions et leurs dépendances |

---

## Comment lancer les scripts

### Scripts Bash

```bash
# Rendre exécutables
chmod +x diagnostics/scripts/*.sh

# 1. Vérifier la structure du projet
./diagnostics/scripts/check_project_structure.sh

# 2. Détecter le mode Supabase (CLI vs Docker)
./diagnostics/scripts/check_supabase_runtime.sh

# 3. Analyser les Edge Functions
./diagnostics/scripts/check_edge_functions_usage.sh
```

### Script SQL

Exécuter dans la console SQL de votre base PostgreSQL (Supabase Studio, psql, ou pgAdmin) :

```bash
psql "$DATABASE_URL" -f diagnostics/sql/security_diagnostics.sql
```

Ou copier/coller le contenu dans l'éditeur SQL de Supabase Studio.

---

## Quels résultats copier/coller pour analyse

1. **La sortie complète** de chaque script bash (y compris les erreurs)
2. **La sortie complète** du script SQL `security_diagnostics.sql`
3. Les **logs d'erreur** visibles dans :
   - La console du navigateur (F12 → Console)
   - Les logs Docker/Supabase (`docker logs`, `supabase functions serve --debug`)
   - Les logs Edge Functions (Supabase Studio → Edge Functions → Logs)

---

## Comprendre les couches de l'application

### a) Frontend public
- Application React/Vite/TypeScript servie en tant que SPA (Single Page Application)
- Communique avec le backend via le SDK Supabase JS (`@supabase/supabase-js`)
- Variables d'env : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Ne contient aucune logique serveur — tout passe par Supabase

### b) Supabase local / CLI
- Le Supabase CLI (`supabase start`, `supabase db reset`) lance un environnement PostgreSQL + GoTrue + PostgREST + Edge Functions en local via Docker
- Utilise `supabase/config.toml` pour la configuration
- Les migrations dans `supabase/migrations/` sont exécutées dans l'ordre alphabétique (= chronologique par timestamp)
- Commande clé : `supabase link --project-ref <ref>` pour relier au projet cloud

### c) Edge Functions
- Fonctions Deno exécutées côté serveur (runtime Deno/V8)
- Déployées automatiquement via Lovable Cloud ou manuellement via `supabase functions deploy`
- Accèdent aux variables : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- Chaque fonction est dans `supabase/functions/<nom>/index.ts`

### d) SMTP applicatif custom
- Le projet utilise son propre serveur SMTP (pas celui de Supabase Auth)
- Configuration stockée en base dans `app_settings` (clés : smtp_host, smtp_port, smtp_user, smtp_password)
- Le mot de passe SMTP est écrit via l'Edge Function `admin-save-smtp-password`
- L'envoi d'emails passe par les Edge Functions `send-notification-email`, `send-test-email`, `send-survey-copy`
- Bibliothèque utilisée : `denomailer` (client SMTP pour Deno)

### e) Migrations SQL
- Fichiers `.sql` dans `supabase/migrations/`
- Exécutées dans l'ordre du timestamp (préfixe `YYYYMMDDHHMMSS_`)
- Contiennent : CREATE TABLE, CREATE TYPE, CREATE FUNCTION, CREATE POLICY, CREATE TRIGGER
- **Ordre critique** : les fonctions `has_role()` doivent être créées AVANT les policies qui les utilisent

---

## Erreurs courantes et causes probables

### `Edge Function returned a non-2xx status code`
- **401** : Header `Authorization` manquant ou token JWT expiré/invalide
- **403** : L'utilisateur n'a pas le rôle requis (admin/super_admin)
- **400** : Corps JSON invalide ou champs manquants
- **500** : Variables d'env manquantes (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), ou fonction SQL manquante (`has_role()`)

### `Failed to fetch`
- Le serveur Edge Functions n'est pas démarré ou pas accessible
- URL Supabase incorrecte dans le frontend
- Problème réseau/CORS
- En local : `supabase functions serve` n'est pas lancé

### `has_role() does not exist`
- La migration qui crée `has_role()` n'a pas été exécutée
- L'enum `app_role` n'existe pas (dépendance)
- La fonction a été supprimée par un `DROP` non intentionnel
- **Solution** : Vérifier avec `security_diagnostics.sql`

### `no Route matched with those values`
- L'Edge Function n'est pas déployée (nom de dossier incorrect)
- Le chemin d'appel ne correspond pas au nom du dossier dans `supabase/functions/`
- En local : `supabase functions serve` ne couvre pas cette fonction

### `Cannot find project ref. Have you run supabase link?`
- Le CLI Supabase n'est pas relié au projet cloud
- **Solution** : `supabase link --project-ref jyqbbfmsvaqnowdhnqof`
- Vérifier que `supabase/config.toml` contient le bon `project_id`
