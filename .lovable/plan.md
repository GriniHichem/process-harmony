

# Dépendances entre actions de projet

## Vue d'ensemble

Ajouter un système de **liaisons entre actions** au sein d'un projet, avec 4 types de relations :

| Mode | Signification | Icône | Règle d'avancement |
|------|--------------|-------|---------------------|
| **Avant** (prédécesseur) | L'action A doit être terminée avant de commencer B | ⬆️ | B reste bloquée (statut "bloquée") tant que A n'est pas terminée |
| **Après** (successeur) | L'action A ne commence qu'après B | ⬇️ | A reste bloquée tant que B n'est pas terminée |
| **Parallèle** | A et B s'exécutent en même temps | ⏸ | L'avancement parent = moyenne des deux |
| **Exclusive (XOR)** | A ou B — une seule suffit | ⚡ | Dès qu'une est terminée, l'autre est marquée "annulée", avancement parent = 100% |

## Changements techniques

### 1. Nouvelle table `project_action_dependencies`

```sql
CREATE TABLE project_action_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  source_action_id uuid REFERENCES project_actions(id) ON DELETE CASCADE NOT NULL,
  target_action_id uuid REFERENCES project_actions(id) ON DELETE CASCADE NOT NULL,
  dependency_type text NOT NULL DEFAULT 'before',  -- before, after, parallel, exclusive
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_action_id, target_action_id)
);
```

- RLS : authenticated users can CRUD
- Ajout colonne `statut` valeur "bloquee" dans `project_actions` (via ALTER)

### 2. Composant `ProjectActionDependencies.tsx` (nouveau)

- Bouton "Lier" sur chaque action → Dialog avec :
  - Liste des autres actions du même projet
  - Sélection du type de dépendance (4 modes avec icônes et descriptions)
- Affichage des liaisons existantes en badges colorés sur chaque action
- Suppression d'une liaison via bouton X

### 3. Logique d'automatisation dans `ProjectActionsList.tsx`

- **Chargement** : fetch des dépendances avec les actions
- **Blocage** : quand on change le statut d'une action, vérifier si ses prédécesseurs sont terminés ; sinon, afficher un toast d'avertissement et empêcher le passage en "en_cours"
- **Déblocage auto** : quand une action passe à "terminée", débloquer automatiquement les actions successeurs (changer de "bloquee" → "planifiee")
- **Exclusive** : quand une action d'une paire exclusive est terminée, marquer l'autre comme "annulee" (avancement = 0, statut spécial)
- **Parallèle** : indicateur visuel uniquement (pas de blocage)

### 4. Visualisation Gantt

- Afficher les flèches de dépendance dans `ProjectGanttChart.tsx` (trait SVG entre barres liées)
- Actions bloquées affichées en gris avec icône cadenas

### 5. Nouveau statut "bloquee" et "annulee"

Ajout dans `ACTION_STATUS` :
```typescript
bloquee: { label: "Bloquée", class: "bg-slate-500/15 text-slate-600" },
annulee: { label: "Annulée", class: "bg-gray-300/15 text-gray-500 line-through" },
```

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Créer table `project_action_dependencies` + ajouter statuts |
| `src/components/projects/ProjectActionDependencies.tsx` | **Nouveau** — UI de gestion des liaisons |
| `src/components/projects/ProjectActionsList.tsx` | Intégrer dépendances, logique blocage/déblocage/exclusion |
| `src/components/projects/ProjectGanttChart.tsx` | Flèches de dépendance + style bloqué |

