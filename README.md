# Q-Process — Système de Management Qualité ISO 9001

Application web de gestion qualité conforme à la norme ISO 9001:2015.

## Stack technique

- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend** : Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Emails** : denomailer (SMTP configurable via base de données)

## Déploiement self-hosted

### Prérequis

- Docker & Docker Compose
- Supabase self-hosted (ou CLI)
- Node.js 18+

### Variables d'environnement frontend

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL de votre instance Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique (anon key) |
| `VITE_SUPABASE_PROJECT_ID` | ID du projet Supabase |

### Installation

```bash
npm install
npm run build
```

### Migrations SQL

Les migrations dans `supabase/migrations/` sont idempotentes et doivent être exécutées dans l'ordre chronologique :

```bash
supabase db reset
```

### Edge Functions

Toutes les Edge Functions utilisent `verify_jwt = false` avec authentification manuelle dans le code. Déploiement :

```bash
supabase functions deploy
```

### Configuration SMTP

La configuration email est stockée dans la table `app_settings` (clés : `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`, `support_email`, `app_name`). Configurable depuis l'interface Super Admin.

### Extensions PostgreSQL requises

- `pg_net` : pour l'envoi d'emails depuis les triggers DB (optionnel — dégradation gracieuse si absent)

## Structure du projet

```
src/                    # Code source React
supabase/functions/     # Edge Functions (Deno)
supabase/migrations/    # Migrations SQL
diagnostics/            # Scripts de diagnostic
```

## Licence

Propriétaire — Groupe AMOUR. Tous droits réservés.
