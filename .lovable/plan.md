

# Module "Évaluation des processus potentiels"

## Vue d'ensemble

Ajouter une page simple `/evaluation-processus` permettant d'évaluer si une activité doit devenir un processus, avec une matrice de 5 critères, un score automatique, et deux actions (ajouter aux processus ou ignorer).

## 1. Base de données

Nouvelle table `process_evaluations` :

| Colonne | Type |
|---|---|
| id | uuid PK |
| nom | text NOT NULL |
| description | text DEFAULT '' |
| score_objectifs | integer DEFAULT 2 |
| score_ca | integer DEFAULT 2 |
| score_satisfaction | integer DEFAULT 2 |
| score_perennite | integer DEFAULT 2 |
| score_risques | integer DEFAULT 2 |
| score_total | integer DEFAULT 10 |
| resultat | text DEFAULT 'activite' |
| statut | text DEFAULT 'en_attente' (en_attente, processus_cree, activite) |
| process_id | uuid nullable (FK si converti en processus) |
| created_at, updated_at | timestamptz |

RLS : SELECT tous authenticated, INSERT/UPDATE/DELETE admin+rmq.

## 2. Nouvelle page `src/pages/EvaluationProcessus.tsx`

- Champs nom + description en haut
- Table avec 5 critères, chacun avec un Select (++/+/-/--)
- Score total calculé automatiquement
- Badge resultat : >= 15 = "Processus", < 15 = "Activité"
- Bouton "Ajouter aux processus" : insère dans `processes` et met a jour `statut` + `process_id`
- Bouton "Ignorer" : sauvegarde avec statut `activite`
- Liste des évaluations existantes en bas

## 3. Intégration

- Route `/evaluation-processus` dans `App.tsx` (admin, rmq, responsable_processus, consultant)
- Lien dans la sidebar sous "Processus" avec icone `ClipboardList`

## Fichiers impactés

1. Migration SQL : table + RLS + trigger updated_at
2. `src/pages/EvaluationProcessus.tsx` (nouveau)
3. `src/App.tsx` : nouvelle route
4. `src/components/AppSidebar.tsx` : nouveau lien sidebar

