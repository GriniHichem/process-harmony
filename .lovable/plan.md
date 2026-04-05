

# Correction calcul multi-tâches + Poids des actions

## Problèmes identifiés

### Bug 1 : Calcul multi-tâches incorrect après suppression
Dans `recalcActionFromTasks`, le calcul re-fetch les tâches depuis la DB (`freshTasks`), donc il devrait être correct. **Mais** `deleteTask` appelle `fetchActions()` qui recharge les actions depuis la DB -- or `fetchActions` ne rappelle PAS `recalcActionFromTasks`. Après suppression d'une tâche, l'avancement stocké en DB pour l'action n'est jamais recalculé. Les 2 tâches restantes sont à 100% mais l'action garde l'ancien avancement calculé quand il y avait 3 tâches (2×100 + 1×0 = 200/3 ≈ 67%, ou pire si le calcul local est désynchronisé).

**Fix** : `deleteTask` doit appeler `recalcActionFromTasks(actionId)` après la suppression, avant `fetchActions()`.

### Feature 2 : Poids par action pour le calcul d'avancement projet
Actuellement : `avg = sum(avancement) / count(actions)` — toutes les actions pèsent pareil.

Ajouter un champ `poids` (integer, default null) sur `project_actions`. Logique :
- Actions avec poids explicite : leur poids est utilisé tel quel
- Actions sans poids : se partagent équitablement le reste (100 - somme des poids explicites)
- Exemple : 5 actions, une à 40% de poids → les 4 autres = 60/4 = 15% chacune
- L'avancement projet = somme pondérée des avancements

## Changements techniques

### 1. Migration SQL
- `ALTER TABLE project_actions ADD COLUMN poids integer DEFAULT NULL`

### 2. `ProjectActionsList.tsx`

**Bug fix** :
- `deleteTask(id)` → trouver le `action_id` de la tâche, supprimer, puis `recalcActionFromTasks(actionId)` puis `fetchActions()`

**Poids** :
- Ajouter `poids` à l'interface `ProjectAction`
- Nouveau calcul d'avancement projet dans `fetchActions` :
```
const totalFixedWeight = actions avec poids → sum(poids)
const remainingWeight = 100 - totalFixedWeight
const autoCount = actions sans poids
const autoWeight = autoCount > 0 ? remainingWeight / autoCount : 0
avg = sum(action.avancement * (action.poids ?? autoWeight)) / 100
```
- UI : champ "Poids (%)" éditable sur chaque action (petit input numérique), avec affichage du poids effectif calculé pour les actions sans poids explicite
- Validation : empêcher que la somme des poids explicites dépasse 100%

### 3. `ProjectGanttChart.tsx`
- Afficher le poids à côté du titre de chaque action si défini

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Ajouter colonne `poids` à `project_actions` |
| `src/components/projects/ProjectActionsList.tsx` | Fix deleteTask + calcul pondéré + UI poids |
| `src/components/projects/ProjectGanttChart.tsx` | Affichage poids |

