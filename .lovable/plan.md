# Plan d'implémentation — Application de gestion ISO 9001

## Phase 1 : Fondations

### 1.1 Base de données & Authentification
- Créer les tables Supabase : `profiles`, `user_roles` (enum: rmq, responsable_processus, consultant, auditeur), `processes`, `process_versions`, `bpmn_diagrams`, `documents`, `indicators`, `indicator_values`, `risks_opportunities`, `audits`, `audit_findings`, `nonconformities`, `actions`, `audit_logs`
- Configurer les politiques RLS par rôle avec fonction `has_role()` security definer
- Mettre en place l'authentification (login, reset password)
- Trigger auto-création profil à l'inscription

### 1.2 Layout & Navigation
- Sidebar avec navigation par module (icônes + labels en français)
- Header avec info utilisateur connecté et déconnexion
- Routes protégées selon le rôle
- Thème professionnel, interface entièrement en français

## Phase 2 : Modules principaux

### 2.1 Gestion des utilisateurs
- Liste des utilisateurs (nom, prénom, email, fonction, rôle, statut)
- Création/modification/désactivation de comptes (RMQ uniquement)
- Attribution des rôles

### 2.2 Gestion des processus
- Liste des processus avec filtres par type (pilotage, réalisation, support) et statut
- Fiche processus complète : code, intitulé, finalité, type, pilote, parties prenantes, entrées/sorties, activités, interactions, ressources, version, statut (brouillon → en validation → validé → archivé)
- Versionnement automatique à chaque modification
- Archivage logique (pas de suppression physique)

### 2.3 Cartographie des processus
- Vue visuelle des processus classés par type (3 colonnes : pilotage, réalisation, support)
- Visualisation des interactions entre processus (liens)
- Clic pour accéder à la fiche détaillée

### 2.4 Visualisation BPMN simplifiée
- Affichage graphique simple des flux d'un processus (activités, décisions, début/fin)
- Association d'un diagramme à un processus
- Gestion des versions de diagrammes
- Rendu visuel basique avec les éléments : tâches, événements, passerelles, flux, annotations

## Phase 3 : Modules qualité

### 3.1 Gestion documentaire
- Upload/téléchargement de fichiers via Supabase Storage
- Association documents ↔ processus (procédures, instructions, formulaires, rapports…)
- Versionnement des documents, métadonnées, archivage logique
- Contrôle d'accès par rôle

### 3.2 Indicateurs & Performance
- Définition d'indicateurs par processus (nom, formule, unité, cible, seuil d'alerte, fréquence)
- Saisie des valeurs avec historique
- Visualisation graphique (courbes/barres via Recharts)
- Alertes visuelles quand seuil dépassé

### 3.3 Risques & Opportunités
- Identification et évaluation par processus (probabilité, impact, criticité)
- Association d'actions de traitement
- Suivi du statut

## Phase 4 : Modules audit & amélioration

### 4.1 Gestion des audits
- Programme d'audit et planification
- Périmètre, auditeur désigné, date
- Saisie des constats/écarts avec preuves
- Génération d'un rapport d'audit
- Suivi des actions issues de l'audit

### 4.2 Non-conformités & Actions
- Enregistrement NC avec référence, origine, gravité, processus lié
- Création d'actions (correctives, préventives, amélioration)
- Chaque action : responsable, échéance, statut, preuve de réalisation, commentaire de clôture
- Lien NC → actions et audit → actions

### 4.3 Traçabilité & Journal d'activité
- Journalisation automatique de toutes les opérations critiques dans `audit_logs`
- Interface de consultation du journal (filtres par utilisateur, entité, date, type d'action)
- Stockage : utilisateur, date/heure, action, entité, ancienne/nouvelle valeur

## Phase 5 : Tableaux de bord & Reporting

### 5.1 Tableau de bord global (page d'accueil)
- Nombre de processus par type et statut
- Indicateurs clés avec alertes
- Audits planifiés/en cours
- Actions en retard
- NC ouvertes
- Activité récente

### 5.2 Reporting
- Liste des processus par type/statut
- Synthèse des audits
- État des écarts ouverts
- Actions en retard
- Indicateurs par processus

## Phase 6 : Système de Notifications (IMPLEMENTÉ)

### 6.1 Base de données
- ✅ Table `notifications` avec RLS (user_id = auth.uid())
- ✅ Table `notification_preferences` avec RLS (user_id = auth.uid())
- ✅ Fonction trigger `notify_responsibility_change()` SECURITY DEFINER
- ✅ Triggers sur 10 tables : actions, process_tasks, processes, quality_objectives, review_decisions, risk_actions, risk_moyens, indicator_actions, indicator_moyens, context_issue_actions
- ✅ Realtime activé sur table notifications

### 6.2 Types de notifications
- **assignation** : nouvelle assignation de responsabilité
- **echeance_proche** : rappel J-N avant échéance
- **retard** : action en retard (échéance dépassée)
- **statut_change** : changement de statut d'un élément

### 6.3 Canaux de distribution
- **push** : notification in-app (temps réel via Realtime)
- **email** : envoi SMTP via Edge Function
- **both** : push + email
- **none** : désactivé

### 6.4 Composants UI
- ✅ `NotificationBell` : icône cloche dans le header avec badge compteur, popover dropdown
- ✅ Page `/notifications` : historique complet avec filtres (type, lu/non lu)
- ✅ `NotificationPreferences` : préférences utilisateur par type de notification

### 6.5 Configuration Super Admin
- ✅ Toggle global email activé/désactivé (`notif_email_enabled`)
- ✅ Délai de rappel par défaut (`notif_rappel_jours_defaut`)

### 6.6 Edge Functions
- ✅ `send-notification-email` : envoi SMTP réutilisant l'infrastructure existante
- ✅ `check-deadlines` : scan quotidien (cron 7h) des échéances et retards

### 6.7 Résolution utilisateur
- `acteur_id` → `profiles.acteur_id` → `profiles.id` (= user_id auth)
- Tables avec `responsable_id` (FK acteurs) : actions, process_tasks, processes, quality_objectives, review_decisions
- Tables avec `responsable` (text = acteur_id) : risk_actions, risk_moyens, indicator_actions, indicator_moyens, context_issue_actions

## Contrôle d'accès (transversal)

Chaque module appliquera les restrictions RBAC :
- **RMQ** : accès total, validation, administration
- **Responsable processus** : accès limité à ses processus
- **Consultant** : consultation + propositions, pas de validation/suppression
- **Auditeur** : consultation + saisie audit, pas de modification processus/indicateurs

## Phase 7 : Règles de compatibilité self-hosting (OBLIGATOIRE)

Ces règles DOIVENT être respectées pour garantir que l'application fonctionne en environnement self-hosted (Ubuntu/Docker + Supabase self-hosted).

### 7.1 Edge Functions
- ✅ **TOUJOURS** `verify_jwt = false` dans `supabase/config.toml`
- ✅ Authentification manuelle dans le code Deno via `Authorization` header + `getUser()` ou `getClaims()`
- ✅ Vérification des rôles via `has_role()` RPC avec service_role client
- ✅ CORS complet : traiter `OPTIONS` + headers sur TOUTES les réponses (succès ET erreurs)
- ❌ JAMAIS de `verify_jwt = true` (bloque les appels en self-hosted avec signing-keys)

### 7.2 Appels frontend → Edge Functions
- ✅ **TOUJOURS** utiliser `supabase.functions.invoke('nom-fonction', { body: {...} })`
- ❌ JAMAIS de `fetch()` direct vers `/functions/v1/...` (perd le JWT, cause 401)

### 7.3 SMTP & Emails
- ✅ Configuration SMTP exclusivement via la table `app_settings` (clés : `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`, `support_email`, `app_name`)
- ✅ Edge Function `send-notification-email` utilise `denomailer` avec config depuis `app_settings`
- ✅ `dispatch_notification_email()` inclut un fallback multi-URL (`kong:8000`, `host.docker.internal:54321`, `127.0.0.1:54321`)
- ❌ JAMAIS de SMTP hardcodé dans le code

### 7.4 Migrations SQL
- ✅ **TOUJOURS** `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE TYPE IF NOT EXISTS`
- ✅ **TOUJOURS** `INSERT INTO ... ON CONFLICT DO NOTHING` pour les données seed (buckets, settings, rôles)
- ✅ `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` pour `ALTER TYPE ADD VALUE`
- ✅ Chaque migration doit être idempotente (rejouable sans erreur)
- ❌ JAMAIS de `ALTER DATABASE postgres` (interdit par Supabase)
- ❌ JAMAIS de modification des schémas réservés (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`)

### 7.5 Lovable AI Gateway
- ⚠️ Le secret `LOVABLE_API_KEY` et l'URL `ai.gateway.lovable.dev` sont exclusifs à Lovable Cloud
- ✅ Toute fonctionnalité IA DOIT prévoir un fallback configurable (clé OpenAI/Gemini propre dans `app_settings`)
- ✅ L'Edge Function IA doit vérifier : 1) `LOVABLE_API_KEY` disponible → utiliser gateway, 2) sinon → lire clé custom depuis `app_settings`
- ❌ JAMAIS de dépendance exclusive à `ai.gateway.lovable.dev` sans fallback

### 7.6 Plugin `lovable-tagger`
- ✅ Garder **strictement conditionnel** : `mode === "development" && componentTagger()`
- ✅ Filtré avec `.filter(Boolean)` pour éviter les erreurs si le package n'est pas installé
- ❌ JAMAIS inclure en mode production

### 7.7 Realtime (Supabase Realtime)
- ✅ Pour chaque table utilisant `postgres_changes`, inclure dans la migration : `ALTER PUBLICATION supabase_realtime ADD TABLE public.nom_table;`
- ✅ Actuellement requis pour : `notifications`
- ❌ JAMAIS supposer que la publication Realtime est activée automatiquement

### 7.8 Storage Buckets
- ✅ Création de buckets avec `INSERT INTO storage.buckets (...) ON CONFLICT (id) DO NOTHING`
- ✅ Buckets existants : `documents` (privé), `survey-images` (public), `branding` (public)
- ❌ JAMAIS de `INSERT INTO storage.buckets` sans `ON CONFLICT`

### 7.9 Extension `pg_net`
- ⚠️ `dispatch_notification_email()` utilise `net.http_post()` qui dépend de `pg_net`
- ✅ Documenter l'installation : `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;`
- ✅ Le bloc `EXECUTE ... EXCEPTION WHEN OTHERS THEN CONTINUE` gère le cas où `pg_net` n'est pas disponible
- ✅ En cas d'absence de `pg_net`, les notifications email seront ignorées silencieusement (les push in-app fonctionnent toujours)

### 7.10 Configuration Auth (GoTrue)
- ✅ En Lovable Cloud : utiliser l'outil `configure_auth` pour activer/désactiver l'auto-confirm
- ✅ En self-hosted : configurer dans `docker-compose.yml` ou `.env` de GoTrue :
  - `GOTRUE_MAILER_AUTOCONFIRM=true` (si auto-confirm souhaité)
  - `GOTRUE_SMTP_HOST`, `GOTRUE_SMTP_PORT`, `GOTRUE_SMTP_USER`, `GOTRUE_SMTP_PASS` (pour les emails auth)
  - `GOTRUE_SITE_URL` (URL du frontend)
- ❌ JAMAIS supposer que l'auto-confirm est activé par défaut

### 7.11 Variables d'environnement frontend (`VITE_*`)
- ✅ Les 3 variables requises : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- ✅ Vérifier leur présence avant usage critique (ex: `SurveyPublicPage` crée un client séparé)
- ✅ Documentation dans `diagnostics/ENV_REQUIREMENTS.md`
- ❌ JAMAIS de secrets privés dans les variables `VITE_*` (exposées dans le bundle)

### 7.12 URLs et domaines
- ❌ JAMAIS hardcoder d'URLs `.supabase.co` dans le code applicatif
- ❌ JAMAIS hardcoder d'URLs `.lovable.app` dans le code applicatif
- ✅ Toujours utiliser `import.meta.env.VITE_SUPABASE_URL` côté frontend
- ✅ Toujours utiliser `Deno.env.get('SUPABASE_URL')` côté Edge Functions
- ✅ Pour les URLs internes (triggers DB), utiliser la table `app_settings` clé `supabase_url`

### 7.13 Résumé — Checklist pré-développement
Avant chaque nouvelle fonctionnalité, vérifier :
- [ ] Edge Functions avec `verify_jwt = false` + auth manuelle
- [ ] Appels via `supabase.functions.invoke()` uniquement
- [ ] Migrations idempotentes (`IF NOT EXISTS`, `ON CONFLICT`)
- [ ] Pas de dépendance exclusive à Lovable Cloud (AI gateway, tagger)
- [ ] Realtime activé pour les tables concernées
- [ ] Storage buckets avec `ON CONFLICT DO NOTHING`
- [ ] Variables d'environnement documentées et vérifiées
- [ ] Aucune URL hardcodée
