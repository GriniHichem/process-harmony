

# Plan : Actions & Moyens pour Risques/Opportunités

## Objectif
Ajouter un système de gestion des **Actions** (pour minimiser un risque ou saisir une opportunité) et des **Moyens** (ressources nécessaires) directement sur chaque risque/opportunité, avec des cartes colorées selon le statut.

## Base de données

Deux nouvelles tables :

- **`risk_actions`** : `id`, `risk_id` (FK → risks_opportunities), `description`, `statut` (a_faire/en_cours/realisee), `date_prevue`, `deadline`, `responsable`, `created_at`, `updated_at`
- **`risk_moyens`** : `id`, `risk_id` (FK → risks_opportunities), `description`, `type_moyen` (humain/materiel/financier/logiciel/autre), `budget`, `date_prevue`, `deadline`, `responsable`, `statut`, `created_at`, `updated_at`

RLS : lecture pour tous les authentifiés, écriture pour admin/rmq/responsable_processus.

## Composant UI

**`src/components/RiskMoyensActions.tsx`** : Composant réutilisable similaire à `IndicatorMoyensActions`, avec :
- Deux sections en grille : **Moyens** et **Actions**
- Cartes colorées selon le statut :
  - **À faire** : bordure grise / fond neutre
  - **En cours** : bordure bleue / fond bleu clair
  - **Réalisée** : bordure verte / fond vert clair
  - **En retard** (deadline dépassée + non réalisée) : bordure rouge / fond rouge clair
- CRUD complet via Dialog (ajouter/modifier/supprimer)
- Budget, dates, responsable, type de moyen affichés sur chaque carte

## Page Risques

Transformer la liste actuelle en vue expandable : cliquer sur un risque/opportunité affiche en dessous les cartes Moyens et Actions associées via le composant `RiskMoyensActions`.

## Fichiers modifiés
1. Migration SQL (2 tables + RLS)
2. `src/components/RiskMoyensActions.tsx` (nouveau)
3. `src/pages/Risques.tsx` (intégration du composant, vue détail expandable)

