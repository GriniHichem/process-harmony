# Q-Process — Self-Hosting avec Supabase Docker (Ubuntu)

## Prérequis

- Ubuntu 20.04+ (ou Debian 11+)
- Docker & Docker Compose installés
- Git
- Node.js 18+ & npm (ou bun)

## 1. Installer Supabase en local

```bash
# Cloner le dépôt Supabase Docker
git clone --depth 1 https://github.com/supabase/supabase.git /opt/supabase
cd /opt/supabase/docker

# Copier et configurer le .env
cp .env.example .env
nano .env
```

### Variables critiques à configurer dans `.env` :

```env
# Générez des clés JWT uniques (https://supabase.com/docs/guides/self-hosting#api-keys)
ANON_KEY=votre-anon-key-jwt
SERVICE_ROLE_KEY=votre-service-role-key-jwt
JWT_SECRET=votre-jwt-secret-min-32-caracteres

# URL publique de votre API
API_EXTERNAL_URL=http://votre-ip:8000
SUPABASE_PUBLIC_URL=http://votre-ip:8000

# Dashboard
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=votre-mot-de-passe-fort

# SMTP (optionnel mais recommandé pour les emails)
SMTP_HOST=smtp.votre-serveur.com
SMTP_PORT=587
SMTP_USER=noreply@votre-domaine.com
SMTP_PASS=votre-mot-de-passe-smtp
SMTP_SENDER_NAME=Q-Process
SMTP_ADMIN_EMAIL=admin@votre-domaine.com
```

### Démarrer Supabase :

```bash
docker compose up -d
```

Vérifier que tout fonctionne :
```bash
docker compose ps
# Tous les services doivent être "Up"
```

## 2. Initialiser la base de données

```bash
# Depuis la racine du projet Q-Process :
cd /chemin/vers/q-process

# Exécuter le fichier de migration complet
docker compose -f /opt/supabase/docker/docker-compose.yml exec db \
  psql -U postgres -d postgres -f /dev/stdin < selfhost/migrations/001_complete_schema.sql

# Créer le premier utilisateur admin
docker compose -f /opt/supabase/docker/docker-compose.yml exec db \
  psql -U postgres -d postgres -f /dev/stdin < selfhost/migrations/002_seed_admin.sql
```

**OU** via le Dashboard Supabase (http://votre-ip:8000) → SQL Editor → coller le contenu des fichiers.

## 3. Déployer les Edge Functions

```bash
# Installer Supabase CLI
npm install -g supabase

# Lier au projet local
supabase link --project-ref local

# Créer le fichier de secrets pour les Edge Functions
cat > supabase/functions/.env << EOF
SUPABASE_URL=http://votre-ip:8000
SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
EOF

# Déployer toutes les fonctions
supabase functions deploy admin-create-user --no-verify-jwt=false
supabase functions deploy admin-reset-password --no-verify-jwt=false
supabase functions deploy admin-save-smtp-password --no-verify-jwt=false
supabase functions deploy check-deadlines --no-verify-jwt=false
supabase functions deploy send-notification-email --no-verify-jwt=false
supabase functions deploy send-survey-copy --no-verify-jwt=true
supabase functions deploy send-test-email --no-verify-jwt=false
```

> **Note** : `send-survey-copy` utilise `--no-verify-jwt=true` car elle est accessible sans authentification (envoi de copies aux répondants anonymes).

## 4. Créer les buckets de stockage

Dans le Dashboard Supabase → Storage, créez :
- `documents` (privé)
- `survey-images` (public)
- `branding` (public)

Ou via SQL :
```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('documents', 'documents', false),
  ('survey-images', 'survey-images', true),
  ('branding', 'branding', true);
```

## 5. Configurer et builder le frontend

```bash
cd /chemin/vers/q-process

# Créer le .env pour le frontend
cat > .env << EOF
VITE_SUPABASE_URL=http://votre-ip:8000
VITE_SUPABASE_PUBLISHABLE_KEY=votre-anon-key
EOF

# Installer les dépendances
npm install

# Builder pour la production
npm run build
```

Le dossier `dist/` contient l'application prête à être servie par Nginx, Caddy, etc.

## 6. Servir avec Nginx (exemple)

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    root /chemin/vers/q-process/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy pour les API Supabase
    location /rest/ {
        proxy_pass http://localhost:8000/rest/;
        proxy_set_header Host $host;
    }
}
```

## 7. Tâches planifiées (cron)

Pour les notifications d'échéances, ajoutez un cron :

```bash
# Vérifier les échéances toutes les heures
0 * * * * curl -X POST http://votre-ip:8000/functions/v1/check-deadlines \
  -H "Authorization: Bearer votre-service-role-key" \
  -H "Content-Type: application/json"
```

## Dépannage

### Erreur "non-2xx" sur création utilisateur
→ Vérifiez que les Edge Functions ont accès aux variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.

### Erreur "has_role() does not exist"
→ Ré-exécutez `selfhost/migrations/001_complete_schema.sql`.

### Le premier utilisateur n'a pas de rôle
→ Exécutez `selfhost/migrations/002_seed_admin.sql` après avoir créé l'utilisateur via le Dashboard.

### Vérification complète
```sql
-- Lancer dans le SQL Editor du Dashboard
SELECT 'enum' AS check, enum_range(NULL::app_role)::text AS result
UNION ALL
SELECT 'table_rls', rowsecurity::text FROM pg_tables WHERE tablename='user_roles'
UNION ALL
SELECT 'has_role_fn', (proname IS NOT NULL)::text FROM pg_proc WHERE proname='has_role'
UNION ALL
SELECT 'trigger', (trigger_name IS NOT NULL)::text FROM information_schema.triggers WHERE trigger_name='on_auth_user_created';
-- Tous les résultats doivent être TRUE
```
