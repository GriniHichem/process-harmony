# 🔐 Variables d'Environnement Requises — Q-Process

## a) Variables Frontend (fichier `.env` à la racine)

| Variable | Où elle est utilisée | Obligatoire | Exemple |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` — URL de l'API Supabase | ✅ Oui | `https://votre-projet.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/client.ts` — Clé anon publique | ✅ Oui | `eyJhbGciOi...` |
| `VITE_SUPABASE_PROJECT_ID` | Référence projet (utilisé dans certains imports) | ⚠️ Optionnel | `abcdefghijklmnop` |

**Note** : Les variables `VITE_*` sont exposées dans le bundle frontend — ne JAMAIS y mettre de secrets.

---

## b) Variables Edge Functions (runtime Deno)

Ces variables sont automatiquement disponibles dans l'environnement Deno des Edge Functions Supabase :

| Variable | Où elle est utilisée | Obligatoire | Exemple |
|---|---|---|---|
| `SUPABASE_URL` | Toutes les Edge Functions — connexion au client Supabase | ✅ Oui | `https://votre-projet.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Toutes les Edge Functions — accès admin complet | ✅ Oui | `eyJhbGciOi...` (clé service_role) |
| `SUPABASE_ANON_KEY` | `admin-save-smtp-password`, `send-test-email` — vérification auth utilisateur | ✅ Oui | `eyJhbGciOi...` (clé anon) |
| `SUPABASE_DB_URL` | Non utilisé directement dans le code actuel | ❌ Non | `postgresql://postgres:...` |

### En local (Supabase CLI)

Pour servir les Edge Functions localement, créer un fichier `supabase/functions/.env` :

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<votre-clé-anon-locale>
SUPABASE_SERVICE_ROLE_KEY=<votre-clé-service-role-locale>
```

Puis lancer :
```bash
supabase functions serve --env-file supabase/functions/.env
```

**⚠️ En Supabase Cloud / Lovable Cloud** : Ces variables sont pré-configurées automatiquement. Pas besoin de les définir manuellement.

---

## c) Variables Supabase local / self-hosted

### Pour `supabase start` (CLI local)

| Variable | Où elle est utilisée | Obligatoire | Exemple |
|---|---|---|---|
| `POSTGRES_PASSWORD` | Mot de passe de la base PostgreSQL locale | ✅ Oui (auto-généré par CLI) | `postgres` |
| `JWT_SECRET` | Secret pour signer les JWT | ✅ Oui (auto-généré par CLI) | `super-secret-jwt-token` |
| `ANON_KEY` | Clé publique anon | ✅ Oui (auto-généré par CLI) | `eyJhbGciOi...` |
| `SERVICE_ROLE_KEY` | Clé service_role | ✅ Oui (auto-généré par CLI) | `eyJhbGciOi...` |

**Note** : Avec `supabase start`, ces valeurs sont affichées automatiquement dans le terminal. Utilisez-les pour configurer le frontend et les Edge Functions.

### Pour self-hosted Docker

Si vous utilisez le `docker-compose.yml` officiel de Supabase :

| Variable | Où elle est utilisée | Obligatoire | Exemple |
|---|---|---|---|
| `POSTGRES_PASSWORD` | Base PostgreSQL | ✅ Oui | `<mot-de-passe-fort>` |
| `JWT_SECRET` | Signature JWT (GoTrue, PostgREST) | ✅ Oui | `<secret-256-bits-minimum>` |
| `ANON_KEY` | Clé publique générée depuis JWT_SECRET | ✅ Oui | `eyJhbGciOi...` |
| `SERVICE_ROLE_KEY` | Clé admin générée depuis JWT_SECRET | ✅ Oui | `eyJhbGciOi...` |
| `API_EXTERNAL_URL` | URL publique de l'API | ✅ Oui | `https://supabase.votre-domaine.com` |
| `SITE_URL` | URL du frontend | ✅ Oui | `https://votre-domaine.com` |
| `SMTP_HOST` | Serveur SMTP pour les emails auth Supabase | ⚠️ Optionnel | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | ⚠️ Optionnel | `465` |
| `SMTP_USER` | Utilisateur SMTP | ⚠️ Optionnel | `noreply@votre-domaine.com` |
| `SMTP_PASS` | Mot de passe SMTP | ⚠️ Optionnel | `<mot-de-passe>` |
| `SMTP_SENDER_NAME` | Nom expéditeur | ⚠️ Optionnel | `Q-Process` |

**⚠️ Important** : Les variables SMTP ci-dessus sont pour les emails **d'authentification Supabase** (confirmation, reset password). Le SMTP **applicatif** de Q-Process est configuré séparément dans la table `app_settings`.

---

## Résumé des dépendances

```
Frontend (.env)
├── VITE_SUPABASE_URL ────────────────→ Supabase API
└── VITE_SUPABASE_PUBLISHABLE_KEY ───→ Supabase Auth

Edge Functions (runtime Deno)
├── SUPABASE_URL ────────────────────→ Supabase API
├── SUPABASE_SERVICE_ROLE_KEY ───────→ Accès admin complet
└── SUPABASE_ANON_KEY ───────────────→ Vérification auth utilisateur

SMTP applicatif (table app_settings)
├── smtp_host ───────────────────────→ Serveur SMTP
├── smtp_port ───────────────────────→ Port (465 TLS / 587 STARTTLS)
├── smtp_user ───────────────────────→ Authentification SMTP
├── smtp_password ───────────────────→ Authentification SMTP
├── support_email ───────────────────→ Adresse expéditeur
└── app_name ────────────────────────→ Nom affiché dans les emails
```
