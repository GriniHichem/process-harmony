

# Plan: Ajouter la modification des Risques/Opportunités et des Actions

## Constat actuel

- **Risques/Opportunités** : on peut créer et supprimer, mais pas modifier (description, type, probabilité, impact, processus, statut).
- **Actions** : on peut modifier le statut et le responsable inline, mais pas la description, le type, l'échéance ni supprimer une action.

## Modifications prévues

### 1. Risques & Opportunités (`src/pages/Risques.tsx`)

- Ajouter un bouton **Modifier** (icône crayon) sur chaque risque/opportunité (visible pour `canCreate` roles).
- Ouvrir un **Dialog d'édition** pré-rempli avec les valeurs actuelles (type, description, processus, probabilité, gravité).
- Fonction `handleUpdate` qui fait un `supabase.update()` sur `risks_opportunities`.
- Ajout d'un état `editRisk` pour stocker le risque en cours d'édition.

### 2. Actions (`src/pages/Actions.tsx`)

- Ajouter un bouton **Modifier** dans la zone expandée pour éditer description, type, échéance via un Dialog.
- Ajouter un bouton **Supprimer** avec confirmation `AlertDialog` (pour rôles `rmq`/`admin`).
- Fonction `handleUpdateAction` pour la mise à jour complète.
- Fonction `handleDeleteAction` pour la suppression.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/Risques.tsx` | Dialog d'édition, bouton modifier, `handleUpdate` |
| `src/pages/Actions.tsx` | Dialog d'édition, bouton supprimer, `handleUpdateAction`, `handleDeleteAction` |

Pas de changement de schéma DB requis -- les politiques RLS existantes couvrent déjà UPDATE et DELETE pour les rôles concernés.

