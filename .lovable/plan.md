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
