

# Corrections et améliorations du module Projets

## Problèmes identifiés

### Erreur 1 — Impossible de créer une action dans un projet
Le code `addAction` dans `ProjectActionsList.tsx` fonctionne correctement côté logique (insert dans `project_actions` avec `project_id` et `title`). Les RLS sont permissives pour `authenticated`. Le problème probable est un conflit TypeScript entre le type attendu par Supabase et les colonnes envoyées — il faut vérifier que `project_id` est bien transmis et qu'il n'y a pas d'erreur silencieuse. Je vais ajouter un meilleur feedback d'erreur et vérifier le flux complet.

### Erreur 2 — Impossible d'ajouter une image au projet
Le formulaire `ProjectForm.tsx` n'a **aucun champ d'upload d'image**. Le champ `image_url` existe en base mais le formulaire ne l'expose pas. Il faut ajouter un composant d'upload vers le bucket `documents` (déjà existant) avec les bonnes RLS.

## Améliorations

### Amélioration 1 — Champ "Objectifs" (liste dynamique)
Ajouter une colonne `objectives` (type `jsonb`, tableau de strings) à la table `projects`. Dans le formulaire et la vue d'ensemble, afficher une liste éditable (ajouter/supprimer des objectifs texte).

### Amélioration 2 — Ressources en liste
Transformer `resources` de texte libre en `jsonb` (tableau de strings). UI avec ajout/suppression dynamique d'items.

### Amélioration 3 — Permissions granulaires sur le projet
Appliquer la logique de permissions existante (`hasPermission("actions", ...)`) de manière cohérente :
- `can_read` → voir le projet et ses détails
- `can_read_detail` → voir les actions et tâches
- `can_edit` → modifier le projet, créer/modifier actions et tâches, ajouter des commentaires
- `can_delete` → supprimer projet, actions, tâches
- Ajouter un système de commentaires sur les actions (réutilisant `ElementNotes` existant)

## Phase 1 — Migration DB

```sql
-- Ajouter objectives (jsonb array) et convertir resources en jsonb
ALTER TABLE projects ADD COLUMN IF NOT EXISTS objectives jsonb DEFAULT '[]';
-- resources reste text pour compatibilité, on ajoute resources_list jsonb
ALTER TABLE projects ADD COLUMN IF NOT EXISTS resources_list jsonb DEFAULT '[]';
```

## Phase 2 — Fix création d'action
- Déboguer `ProjectActionsList.tsx` : ajouter logs d'erreur détaillés
- S'assurer que le bouton "Action" et l'input sont bien rendus et fonctionnels
- Vérifier qu'aucune erreur TypeScript ne bloque l'insert

## Phase 3 — Upload image projet
Dans `ProjectForm.tsx` :
- Ajouter un input file pour l'image
- Upload vers le bucket `documents` (path: `project-images/{projectId}/{filename}`)
- Stocker l'URL publique dans `image_url`
- Afficher un aperçu dans le formulaire

## Phase 4 — Objectifs et Ressources en listes
Dans `ProjectForm.tsx` :
- Remplacer le textarea "Ressources" par une liste dynamique (input + bouton ajouter, items avec bouton supprimer)
- Ajouter une section "Objectifs" identique
- Sauvegarder en `jsonb` dans les nouvelles colonnes

Dans `ProjectDetail.tsx` (vue d'ensemble) :
- Afficher les objectifs et ressources sous forme de listes à puces ou badges

## Phase 5 — Permissions et commentaires
Dans `ProjectDetail.tsx` :
- Conditionner l'affichage des onglets selon `can_read` / `can_read_detail`
- Masquer les boutons Modifier/Supprimer sans `can_edit` / `can_delete`
- Mode lecture seule complet quand pas de `can_edit`

Dans `ProjectActionsList.tsx` :
- Ajouter `ElementNotes` pour chaque action (type `project_action`, id = action.id)
- Les commentaires sont visibles avec `can_read_detail`, créables avec `can_edit`

## Fichiers modifiés

| Fichier | Action |
|---|---|
| Migration SQL | +2 colonnes `objectives`, `resources_list` sur `projects` |
| `src/components/projects/ProjectForm.tsx` | Upload image, objectifs liste, ressources liste |
| `src/components/projects/ProjectActionsList.tsx` | Fix insert, ajout commentaires via ElementNotes, permissions |
| `src/pages/ProjectDetail.tsx` | Affichage objectifs/ressources, permissions granulaires |

