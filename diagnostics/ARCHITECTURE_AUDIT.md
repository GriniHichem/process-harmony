# 🏗️ Audit d'Architecture — Q-Process

## Architecture réelle du projet

Le projet Q-Process est une application de gestion qualité ISO 9001 construite sur :

### Stack Frontend
- **React 18** + **TypeScript** + **Vite** (bundler)
- **Tailwind CSS** + **shadcn/ui** (composants)
- **React Router** (routing SPA)
- **Recharts** (graphiques indicateurs)
- **Framer Motion** (animations)
- Point d'entrée : `src/main.tsx` → `src/App.tsx`

### Stack Backend (Supabase)
- **PostgreSQL** (base de données avec RLS)
- **GoTrue** (authentification — login email/password)
- **PostgREST** (API REST auto-générée)
- **Edge Functions** (Deno runtime — 7 fonctions)
- **Storage** (3 buckets : documents, survey-images, branding)
- **Realtime** (notifications en temps réel)

---

## Mode de déploiement supposé

### Sur Lovable Cloud (mode principal)
- Le fichier `supabase/config.toml` contient `project_id = "jyqbbfmsvaqnowdhnqof"`
- Les variables `.env` pointent vers `https://jyqbbfmsvaqnowdhnqof.supabase.co`
- Les Edge Functions sont déployées automatiquement par Lovable
- **Ce mode fonctionne tel quel**

### Sur serveur Ubuntu (mode cible de ce diagnostic)
- **Supabase CLI local** : Nécessite Docker + `supabase start`
- **Supabase self-hosted Docker** : Nécessite `docker-compose.yml` Supabase (NON fourni dans le repo)
- **Constat** : Le repo ne contient PAS de `docker-compose.yml` ni de configuration self-hosted Supabase
- **Le projet suppose un Supabase CLI local** (via `supabase start`) OU un Supabase Cloud distant

### Incohérence potentielle
- Le `config.toml` ne contient que `project_id` — pas de configuration locale complète
- Aucun `docker-compose.yml` Supabase n'est présent
- Pour un self-hosting complet, il faudrait ajouter la stack Docker Supabase

---

## Dépendances critiques

### 1. Authentification
| Fichier | Rôle |
|---|---|
| `src/contexts/AuthContext.tsx` | Contexte React auth (login/logout/session) |
| `src/pages/Login.tsx` | Page de connexion |
| `src/pages/ResetPassword.tsx` | Réinitialisation mot de passe |
| `src/components/ProtectedRoute.tsx` | Route protégée (redirect si non auth) |
| `src/components/ChangePasswordDialog.tsx` | Dialogue changement mot de passe |

### 2. Rôles et permissions
| Fichier | Rôle |
|---|---|
| `src/components/RoleGuard.tsx` | Garde de rôle côté frontend |
| `src/lib/defaultPermissions.ts` | Permissions par défaut par rôle |
| `src/pages/AdminPermissions.tsx` | Gestion des permissions admin |
| `src/pages/Utilisateurs.tsx` | Gestion des utilisateurs |
| `src/pages/SuperAdmin.tsx` | Page super admin |

### 3. Edge Functions
| Fonction | Rôle |
|---|---|
| `admin-create-user` | Création utilisateur (admin only) |
| `admin-reset-password` | Reset mot de passe (admin only) |
| `admin-save-smtp-password` | Sauvegarde mot de passe SMTP (super_admin only) |
| `send-test-email` | Envoi email de test SMTP (super_admin only) |
| `send-notification-email` | Envoi email de notification (système) |
| `send-survey-copy` | Envoi copie sondage au répondant (sans auth) |
| `check-deadlines` | Scan des échéances (cron/système) |

### 4. Tables auth / profils / rôles
| Table | Rôle |
|---|---|
| `auth.users` | Utilisateurs Supabase (géré par GoTrue) |
| `profiles` | Profils publics (lié à auth.users via id) |
| `user_roles` | Rôles applicatifs (FK vers auth.users) |
| `custom_roles` | Rôles personnalisés |
| `custom_role_permissions` | Permissions par rôle personnalisé |

### 5. Fonctions SQL SECURITY DEFINER
| Fonction | Rôle |
|---|---|
| `has_role(_user_id, _role)` | Vérifie si un utilisateur a un rôle donné |
| `get_user_role(_user_id)` | Retourne le rôle principal d'un utilisateur |
| `handle_new_user()` | Trigger : crée profil + assigne rôle à l'inscription |
| `notify_responsibility_change()` | Trigger : crée notification lors d'assignation |
| `resolve_notification_channel()` | Résout le canal de notification (push/email/both) |
| `dispatch_notification_email()` | Trigger : envoie email via Edge Function |
| `log_audit_event()` | Trigger : journalise les opérations CRUD |

### 6. Triggers
| Trigger | Table | Fonction |
|---|---|---|
| `on_auth_user_created` | `auth.users` | `handle_new_user()` |
| `dispatch_email_on_notification` | `notifications` | `dispatch_notification_email()` |
| `update_*_updated_at` | Multiples tables | `update_updated_at_column()` |
| Triggers de notification | 10 tables métier | `notify_responsibility_change()` |

### 7. SMTP custom
| Élément | Détail |
|---|---|
| Configuration | Table `app_settings` (clés smtp_*) |
| Sauvegarde mdp | Edge Function `admin-save-smtp-password` |
| Envoi test | Edge Function `send-test-email` |
| Envoi notifs | Edge Function `send-notification-email` |
| Envoi sondage | Edge Function `send-survey-copy` |
| Bibliothèque | `denomailer@1.6.0` (Deno) |

---

## Fichiers clés du projet

### Auth & Rôles
```
src/contexts/AuthContext.tsx
src/components/ProtectedRoute.tsx
src/components/RoleGuard.tsx
src/lib/defaultPermissions.ts
src/pages/Login.tsx
src/pages/Utilisateurs.tsx
src/pages/SuperAdmin.tsx
src/pages/AdminPermissions.tsx
```

### Edge Functions
```
supabase/functions/admin-create-user/index.ts
supabase/functions/admin-reset-password/index.ts
supabase/functions/admin-save-smtp-password/index.ts
supabase/functions/send-test-email/index.ts
supabase/functions/send-notification-email/index.ts
supabase/functions/send-survey-copy/index.ts
supabase/functions/check-deadlines/index.ts
```

### SMTP
```
supabase/functions/send-test-email/index.ts
supabase/functions/send-notification-email/index.ts
supabase/functions/send-survey-copy/index.ts
supabase/functions/admin-save-smtp-password/index.ts
```

### Déploiement / Configuration
```
supabase/config.toml
.env
package.json
vite.config.ts
supabase/migrations/*.sql (61 fichiers)
```
