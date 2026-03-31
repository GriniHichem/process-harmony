

# Évolution du module Actions → Gestion de Projets / Plans d'action

## Vue d'ensemble

Transformer le module "Actions" en un module complet de gestion de projets avec 3 niveaux hiérarchiques : **Projet → Actions → Tâches**. Ajouter une vue planning style Gantt pour visualiser la timeline. Le module "actions" existant dans les permissions et la navigation est renommé conceptuellement mais conserve le même identifiant technique.

## Architecture des données

```text
┌─────────────────────────────┐
│         PROJET              │
│  titre, slogan, image,      │
│  description, ressources    │
│  processus liés, acteurs    │
├─────────────────────────────┤
│    ACTION (1..N par projet) │
│  titre, responsable, dates, │
│  statut, avancement         │
├─────────────────────────────┤
│    TÂCHE (1..N par action)  │
│  titre, responsable, dates, │
│  statut, avancement         │
└─────────────────────────────┘
```

## Phase 1 — Migration base de données

### Nouvelles tables

**`projects`** — Plan d'action / Projet
- `id` uuid PK
- `title` text NOT NULL
- `slogan` text
- `image_url` text
- `description` text
- `resources` text (ressources texte libre)
- `statut` text DEFAULT 'en_cours' (brouillon, en_cours, termine, archive)
- `date_debut` date
- `date_fin` date
- `created_by` uuid
- `created_at`, `updated_at` timestamps

**`project_processes`** — Processus liés (M2M)
- `id` uuid PK
- `project_id` uuid FK → projects
- `process_id` uuid FK → processes

**`project_actors`** — Acteurs liés (M2M)
- `id` uuid PK
- `project_id` uuid FK → projects
- `acteur_id` uuid FK → acteurs

**`project_actions`** — Actions d'un projet
- `id` uuid PK
- `project_id` uuid FK → projects
- `title` text NOT NULL
- `description` text
- `responsable_id` uuid FK → acteurs
- `responsable_user_id` uuid
- `date_debut` date
- `echeance` date
- `statut` text DEFAULT 'planifiee'
- `avancement` integer DEFAULT 0
- `ordre` integer DEFAULT 0
- `created_at`, `updated_at` timestamps

**`project_tasks`** — Tâches d'une action
- `id` uuid PK
- `action_id` uuid FK → project_actions ON DELETE CASCADE
- `title` text NOT NULL
- `responsable_id` uuid FK → acteurs
- `responsable_user_id` uuid
- `date_debut` date
- `echeance` date
- `statut` text DEFAULT 'a_faire' (a_faire, en_cours, termine)
- `avancement` integer DEFAULT 0
- `ordre` integer DEFAULT 0
- `created_at`, `updated_at` timestamps

### RLS

- Toutes les tables : authenticated peut SELECT, INSERT, UPDATE, DELETE (permissions gérées côté applicatif via le module "actions")

### Audit triggers

- Ajouter `log_audit_event` sur `projects`, `project_actions`, `project_tasks`

## Phase 2 — Pages et composants

### Navigation

Renommer dans `AppNavbar.tsx` :
- "Actions" → "Plans d'action" avec icône `FolderKanban`
- URL reste `/actions`
- Module permission reste `actions`

### Page principale `/actions` — Liste des projets

**Deux vues** (toggle tabs) :
1. **Vue Projets** — grille de cartes projet avec image, titre, slogan, barre de progression globale, nombre d'actions, statut, dates
2. **Vue Planning** — diagramme Gantt simplifié

**Fonctionnalités :**
- Créer un projet (dialog avec titre, slogan, description, upload image, sélection processus et acteurs)
- Filtrer par statut, processus, acteur
- Cliquer sur un projet → page détail

### Page détail `/actions/:projectId` — Détail projet

**En-tête :** image bannière, titre, slogan, statut, progression globale, dates, boutons éditer/supprimer

**Onglets :**
1. **Vue d'ensemble** — description, ressources, processus liés (badges), acteurs liés (badges)
2. **Actions & Tâches** — liste des actions en accordéon, chaque action contient ses tâches. CRUD inline pour actions et tâches. Drag possible pour réordonner.
3. **Planning** — vue Gantt focalisée sur ce projet

### Composant Gantt (`ProjectGanttChart.tsx`)

Vue timeline horizontale construite en CSS/HTML (pas de librairie externe) :
- Axe X = jours/semaines/mois (zoom auto selon étendue)
- Lignes groupées : Projet → Actions → Tâches (arborescence collapsable)
- Barres colorées par statut (planifié=gris, en cours=bleu, terminé=vert, en retard=rouge)
- Barre de progression intégrée dans chaque barre
- Marqueur "aujourd'hui" (ligne verticale rouge)
- Tooltip au hover : titre, responsable, dates, avancement
- Responsive : scroll horizontal avec header fixe

### Actions existantes (table `actions`)

Les actions existantes (correctives/préventives) restent dans la table `actions` actuelle. La page les affiche dans un onglet séparé "Actions correctives" pour ne rien casser. Les nouvelles actions projet utilisent la nouvelle table `project_actions`.

## Phase 3 — Calcul automatique de l'avancement

- Avancement d'une action = moyenne des avancements de ses tâches
- Avancement d'un projet = moyenne des avancements de ses actions
- Calcul côté client à chaque mise à jour

## Fichiers

| Fichier | Action |
|---|---|
| Migration SQL | 5 nouvelles tables + RLS + triggers |
| `src/pages/Actions.tsx` | Refonte complète → hub projets + onglet actions correctives |
| `src/pages/ProjectDetail.tsx` | **Nouveau** — détail projet avec onglets |
| `src/components/projects/ProjectCard.tsx` | **Nouveau** — carte projet |
| `src/components/projects/ProjectForm.tsx` | **Nouveau** — formulaire création/édition |
| `src/components/projects/ProjectActionsList.tsx` | **Nouveau** — liste actions + tâches |
| `src/components/projects/ProjectGanttChart.tsx` | **Nouveau** — vue Gantt CSS |
| `src/components/AppNavbar.tsx` | Renommer "Actions" → "Plans d'action" |
| `src/pages/Modules.tsx` | Mettre à jour label et description |
| `src/App.tsx` | Ajouter route `/actions/:projectId` |
| `src/lib/defaultPermissions.ts` | Mettre à jour le label "Plans d'action" |

## Contraintes

- Migration idempotente (`IF NOT EXISTS`)
- Les actions correctives existantes (table `actions`) ne sont pas touchées
- Le module permission reste `actions` — pas de changement dans la matrice
- Upload image projet via le bucket `documents` existant
- Pas de dépendance externe pour le Gantt — pur CSS grid + calcul JS
- Design cohérent avec le système premium existant (glass-card, élévations, gradients)

