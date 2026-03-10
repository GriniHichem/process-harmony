

# Plan : Gestion des Interactions inter-processus (ISO 9001)

## Concept

Remplacer la liste simple "Interactions" dans les elements par un composant specialise qui permet de :
1. Selectionner un ou plusieurs processus cibles
2. Pour chaque processus cible, choisir des donnees d'entree (DE) et/ou sortie (DS) du processus courant a echanger
3. Appliquer le principe inverse : les sorties du processus courant deviennent des entrees dans le processus cible, et inversement

## Nouvelle table : `process_interactions`

```sql
CREATE TABLE process_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_process_id uuid NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  target_process_id uuid NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  element_id uuid NOT NULL REFERENCES process_elements(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('entree', 'sortie')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_process_id, target_process_id, element_id)
);
```

- `direction` = perspective du processus source (entree = DE du source envoye, sortie = DS du source envoye)
- RLS : SELECT pour tous les authentifies, INSERT/UPDATE/DELETE pour rmq, responsable_processus, consultant, admin

## Nouveau composant : `ProcessInteractionManager`

Remplace `ProcessElementList` pour le type "interaction" dans `ProcessDetail.tsx`.

**UI** :
- Bouton "Ajouter une interaction" ouvre un Dialog
- Dans le dialog :
  - Select pour choisir un processus cible (liste des autres processus)
  - Liste des donnees d'entree (DE) du processus courant avec checkbox + icone "↓ In"
  - Liste des donnees de sortie (DS) du processus courant avec checkbox + icone "↑ Out"
  - Bouton "Enregistrer"
- Affichage des interactions existantes groupees par processus cible, avec icones in/out

**Logique de sauvegarde (principe inverse)** :
- Pour chaque DS selectionne du source → creer un element DE dans le processus cible (si pas deja existant)
- Pour chaque DE selectionne du source → creer un element DS dans le processus cible (si pas deja existant)
- Inserer les lignes dans `process_interactions`
- Creer aussi l'interaction inverse dans `process_interactions` pour le processus cible

## Fichiers modifies

1. **Migration SQL** : creer table `process_interactions` + RLS policies
2. **Nouveau** `src/components/ProcessInteractionManager.tsx` : composant de gestion des interactions
3. **Modifie** `src/pages/ProcessDetail.tsx` : remplacer `ProcessElementList` par `ProcessInteractionManager` pour le type "interaction"

