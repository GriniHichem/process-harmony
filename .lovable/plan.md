

# Plan : Renforcement des accès et commentaires dans les Plans d'action

## Résumé des demandes

1. **Suppression** : seul le responsable du projet peut supprimer des éléments (actions, tâches)
2. **Mode public** : les acteurs avec droits module peuvent voir + commenter, mais pas modifier (sauf si collaborateur "Écriture")
3. **Mode privé** : même la lecture est restreinte au responsable + collaborateurs (déjà en place — à confirmer/renforcer)
4. **Historique par action** : chaque modification d'action est tracée (user + date + champs modifiés), visible uniquement par le responsable du projet et l'admin
5. **Commentaires d'action** : admin peut tout supprimer ; l'auteur peut modifier/supprimer dans les 5 premières minutes

---

## Changements prévus

### 1. Migration SQL — Nouvelles tables

**Table `project_action_comments`** :
- `id`, `action_id` (FK project_actions), `user_id` (FK auth.users), `content` (text), `created_at`, `updated_at`
- RLS : authenticated users can SELECT/INSERT ; UPDATE/DELETE limité (logique applicative pour la règle des 5 min)

**Table `project_action_history`** :
- `id`, `action_id` (FK project_actions), `user_id`, `field_name`, `old_value`, `new_value`, `created_at`
- RLS : SELECT pour authenticated (filtrage côté app)
- Trigger `log_action_changes()` sur `project_actions` AFTER UPDATE qui insère un diff par champ modifié

### 2. `ProjectDetail.tsx` — Permissions affinées

| Permission | Règle actuelle | Nouvelle règle |
|---|---|---|
| `canDelete` | admin ∨ responsable ∨ (public & module delete) | **responsable uniquement** (+ admin) |
| `canEdit` | admin ∨ responsable ∨ collab write ∨ (public & module edit) | Inchangé (correct) |
| `canComment` | N/A | **Nouveau** : `canRead && authenticated` (tout utilisateur qui peut voir) |

- Passer `canComment`, `isResponsable`, `isAdmin` à `ProjectActionsList`

### 3. `ProjectActionsList.tsx` — Restrictions de suppression + commentaires

- **Props** : ajouter `canComment`, `isResponsable`, `isAdmin`
- **Suppression actions/tâches** : conditionner les boutons supprimer à `isResponsable || isAdmin` au lieu de `canDelete`
- **Section commentaires** par action : nouveau composant `ProjectActionComments` affiché dans chaque action dépliée
- **Historique** par action : bouton "Historique" visible uniquement si `isResponsable || isAdmin`, ouvre un dialog avec les modifications tracées

### 4. Nouveau composant `ProjectActionComments.tsx`

- Affiche les commentaires de l'action depuis `project_action_comments`
- Formulaire d'ajout si `canComment`
- Chaque commentaire affiche : auteur (avatar + nom), date, contenu
- **Bouton modifier** : visible uniquement par l'auteur, dans les 5 min après création
- **Bouton supprimer** : visible par l'auteur (< 5 min) OU par l'admin (toujours)
- Indicateur visuel "modifié" si `updated_at > created_at`

### 5. Nouveau composant `ProjectActionHistory.tsx`

- Charge `project_action_history` pour une action donnée
- Affiche un timeline : date, utilisateur, champ modifié, ancienne → nouvelle valeur
- Labels français pour les champs (title → "Titre", statut → "Statut", etc.)

### 6. Trigger SQL `log_project_action_changes()`

```text
AFTER UPDATE ON project_actions
FOR EACH ROW → compare OLD vs NEW pour chaque champ
→ INSERT INTO project_action_history (action_id, user_id, field_name, old_value, new_value)
```

---

## Fichiers impactés

| Fichier | Changement |
|---|---|
| Migration SQL | Tables `project_action_comments`, `project_action_history` + trigger + RLS |
| `src/pages/ProjectDetail.tsx` | `canDelete` = responsable/admin only, passer `canComment`/`isResponsable`/`isAdmin` |
| `src/components/projects/ProjectActionsList.tsx` | Nouvelles props, restriction suppression, intégration commentaires + historique |
| `src/components/projects/ProjectActionComments.tsx` | **Nouveau** — Commentaires avec règle 5 min |
| `src/components/projects/ProjectActionHistory.tsx` | **Nouveau** — Historique modifications par action |

