

# Plan : Commentaires privés dans les Plans d'action

## Concept
Ajouter une option "commentaire privé" qui n'est visible que par le **responsable du projet** et le **responsable de l'action** (+ admin). Les autres utilisateurs ne voient que les commentaires publics.

## Changements

### 1. Migration DB — Ajouter colonne `is_private`
```sql
ALTER TABLE project_action_comments ADD COLUMN is_private boolean NOT NULL DEFAULT false;
```

### 2. `ProjectActionComments.tsx` — Filtrage + UI privé

**Nouvelles props** : `projectResponsableUserId` et `actionResponsableUserId` pour déterminer qui peut voir les commentaires privés.

**Logique de visibilité** : un commentaire privé est visible si :
- L'utilisateur courant est admin, OU
- L'utilisateur courant est le responsable du projet (`projectResponsableUserId`), OU
- L'utilisateur courant est le responsable de l'action (`actionResponsableUserId`), OU
- L'utilisateur courant est l'auteur du commentaire

**UI** :
- Checkbox/switch "Privé" à côté du bouton Envoyer (icône cadenas)
- Badge visuel 🔒 sur les commentaires privés
- Fond légèrement différent (bordure orange/amber) pour distinguer visuellement

**Insertion** : envoyer `is_private` lors de l'insert.

**Filtrage côté client** : après fetch, filtrer les commentaires privés pour n'afficher que ceux autorisés.

### 3. `ProjectActionsList.tsx` — Passer les nouvelles props
Transmettre `projectResponsableUserId` (depuis les props ou le projet) et `actionResponsableUserId` (depuis `action.responsable_user_id`) à chaque instance de `ProjectActionComments`.

### 4. `ProjectGanttChart.tsx` — Passer les nouvelles props
Même chose pour l'instance dans le panneau latéral du Gantt.

## Fichiers impactés

| Fichier | Changement |
|---|---|
| Migration SQL | Ajouter `is_private` à `project_action_comments` |
| `ProjectActionComments.tsx` | Props + filtrage + toggle privé + badge visuel |
| `ProjectActionsList.tsx` | Passer `projectResponsableUserId` + `actionResponsableUserId` |
| `ProjectGanttChart.tsx` | Passer les mêmes props |

