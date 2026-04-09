

# Plan : Correction multi-tâches — pas de tâche auto-créée + minimum 2 tâches

## Problème actuel
1. Quand on active le mode multi-tâches, une tâche est automatiquement créée avec le titre de l'action — l'utilisateur ne veut pas ça
2. L'avancement doit être calculé uniquement à partir des tâches créées manuellement
3. Il faut un minimum de 2 tâches pour qu'une action multi-tâches soit considérée valide

## Changements prévus

### Fichier : `src/components/projects/ProjectActionsList.tsx`

**1) `toggleMultiTasks` — Supprimer la création automatique de tâche**
- Quand on active multi-tâches : juste mettre `multi_tasks: true` + `avancement: 0`, sans insérer de tâche
- L'utilisateur crée ses tâches manuellement ensuite

**2) `recalcActionFromTasks` — Calcul uniquement si ≥ 1 tâche existe**
- Si 0 tâches → avancement = 0, statut = "planifiee" (déjà le cas, OK)
- Calcul normal de la moyenne des avancements des tâches existantes

**3) Validation visuelle — Avertissement si < 2 tâches**
- Afficher un message d'avertissement dans la section tâches quand il y a moins de 2 tâches : "Minimum 2 tâches requises"
- Empêcher la clôture (statut "terminée") d'une action multi-tâches ayant moins de 2 tâches

**4) `confirmCloseAction` — Bloquer si < 2 tâches**
- Avant de permettre la clôture d'une action multi-tâches, vérifier qu'il y a au moins 2 tâches

## Résumé
| Fichier | Changement |
|---|---|
| `src/components/projects/ProjectActionsList.tsx` | Supprimer auto-création tâche, ajouter validation min 2, avertissement UI |

