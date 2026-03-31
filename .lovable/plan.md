

# Évolution des Actions — Mode simple / multi-tâches + Multi-responsables

## Ce qui change

### 1. Multi-responsables sur l'action (jusqu'à 3)

Ajouter 2 colonnes à `project_actions` :
- `responsable_id_2` uuid nullable FK → acteurs
- `responsable_id_3` uuid nullable FK → acteurs

L'UI affiche jusqu'à 3 sélecteurs de responsable côte à côte. Le premier est obligatoire quand on assigne, les 2 suivants optionnels.

### 2. Mode action simple vs multi-tâches

Ajouter une colonne `multi_tasks` boolean DEFAULT false à `project_actions`.

**Mode simple (par défaut)** : l'action n'a pas de tâches visibles. L'avancement et le statut se gèrent directement sur l'action. La zone tâches est masquée, remplacée par un slider d'avancement simple.

**Mode multi-tâches** : activé via un toggle/switch. Une fois activé, la zone tâches apparaît. L'avancement de l'action = moyenne des avancements des tâches. Les tâches héritent par défaut de l'échéance de l'action à la création. Chaque tâche a son propre responsable (un seul) et sa propre échéance.

### 3. Comportement du toggle multi-tâches

- Quand on **active** le mode : une première tâche est créée automatiquement avec le titre de l'action et l'échéance de l'action.
- Quand on **désactive** le mode : confirmation demandée si des tâches existent, elles seront supprimées.
- Le toggle n'est visible que si `canEdit` est true.

## Migration SQL

```sql
ALTER TABLE project_actions
  ADD COLUMN IF NOT EXISTS multi_tasks boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS responsable_id_2 uuid REFERENCES acteurs(id),
  ADD COLUMN IF NOT EXISTS responsable_id_3 uuid REFERENCES acteurs(id);
```

## Modifications UI — `ProjectActionsList.tsx`

### Zone responsables (dans le bloc inline edit de l'action)
- 3 sélecteurs côte à côte : "Responsable 1", "Responsable 2 (opt.)", "Responsable 3 (opt.)"
- Compact : les 2 et 3 apparaissent avec un bouton "+" pour les révéler, et un "×" pour les vider

### Toggle multi-tâches
- Un `Switch` avec label "Multi-tâches" dans la barre d'édition de l'action
- Quand off : afficher un slider `<input type="range">` pour l'avancement (0-100) directement sur l'action
- Quand on : afficher la liste des tâches + ajout, l'avancement est calculé automatiquement (lecture seule)

### Tâches
- À la création d'une tâche, `echeance` = `action.echeance` par défaut
- Chaque tâche garde son sélecteur responsable unique et sa date

## Modifications — `ProjectDetail.tsx` et `ProjectGanttChart.tsx`

- Afficher les responsables supplémentaires dans la vue d'ensemble (badges)
- Le Gantt montre les tâches uniquement si `multi_tasks` est activé

## Fichiers modifiés

| Fichier | Action |
|---|---|
| Migration SQL | +3 colonnes sur `project_actions` |
| `ProjectActionsList.tsx` | Toggle multi-tâches, slider avancement, 3 responsables |
| `ProjectDetail.tsx` | Affichage multi-responsables |
| `ProjectGanttChart.tsx` | Conditionner affichage tâches |
| Interfaces `ProjectAction` | +3 champs |

