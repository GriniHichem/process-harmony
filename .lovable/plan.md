

# Implementation des 5 modules ISO 9001 manquants (priorite haute)

## Vue d'ensemble

5 nouveaux modules a creer, avec droits de modification pour admin/rmq et consultation pour les autres roles.

## 1. Tables a creer (migration SQL)

### 1.1 `quality_policy` (Clause 5.2 - Politique qualite)
- `id`, `titre`, `contenu` (text), `objectifs` (text), `date_approbation` (date), `approuve_par` (uuid), `version` (integer), `statut` (text: brouillon/valide/archive), `created_at`, `updated_at`

### 1.2 `quality_objectives` (Clause 5.2 - Objectifs qualite)
- `id`, `reference` (text), `description` (text), `indicateur` (text), `cible` (text), `echeance` (date), `responsable_id` (uuid), `process_id` (uuid nullable), `statut` (text: en_cours/atteint/non_atteint), `commentaire` (text), `created_at`, `updated_at`

### 1.3 `competences` (Clause 7.2 - Competences & Formations)
- `id`, `acteur_id` (uuid), `competence` (text), `niveau` (text: debutant/intermediaire/avance/expert), `date_evaluation` (date), `prochaine_evaluation` (date nullable), `commentaire` (text), `created_at`, `updated_at`

### 1.4 `formations` (Clause 7.2)
- `id`, `titre` (text), `description` (text), `acteur_id` (uuid), `date_formation` (date), `formateur` (text), `duree_heures` (numeric), `efficacite` (text: non_evaluee/efficace/non_efficace), `preuve` (text nullable), `commentaire` (text), `created_at`, `updated_at`

### 1.5 `satisfaction_surveys` (Clause 9.1.2 - Satisfaction client)
- `id`, `reference` (text), `titre` (text), `date_enquete` (date), `type_enquete` (text: questionnaire/entretien/reclamation/retour_client), `score_global` (numeric nullable), `nombre_reponses` (integer), `analyse` (text), `actions_prevues` (text), `responsable_id` (uuid nullable), `process_id` (uuid nullable), `statut` (text: planifiee/en_cours/terminee/analysee), `created_at`, `updated_at`

### 1.6 `suppliers` (Clause 8.4 - Fournisseurs)
- `id`, `reference` (text), `nom` (text), `type_prestataire` (text: fournisseur/sous_traitant/prestataire), `domaine` (text), `contact` (text), `email` (text nullable), `telephone` (text nullable), `statut` (text: actif/suspendu/retire), `date_evaluation` (date nullable), `score_evaluation` (numeric nullable), `criteres_evaluation` (text), `commentaire` (text), `created_at`, `updated_at`

### 1.7 `management_reviews` (Clause 9.3 - Revue de direction)
- `id`, `reference` (text), `date_revue` (date), `participants` (text), `elements_entree` (text - donnees d'entree ISO), `decisions` (text), `actions_decidees` (text), `responsable_id` (uuid nullable), `statut` (text: planifiee/realisee/cloturee), `compte_rendu` (text), `prochaine_revue` (date nullable), `created_at`, `updated_at`

### RLS pour toutes les tables
- **SELECT**: tous les `authenticated`
- **INSERT/UPDATE**: admin + rmq uniquement
- **DELETE**: admin uniquement

## 2. Pages a creer

| Fichier | Clause | Contenu |
|---|---|---|
| `src/pages/PolitiqueQualite.tsx` | 5.2 | Politique qualite + tableau des objectifs |
| `src/pages/Competences.tsx` | 7.2 | Liste competences/formations par acteur |
| `src/pages/SatisfactionClient.tsx` | 9.1.2 | Enquetes de satisfaction, scores, analyses |
| `src/pages/Fournisseurs.tsx` | 8.4 | Registre fournisseurs avec evaluations |
| `src/pages/RevueDirection.tsx` | 9.3 | Planification et PV des revues de direction |

Chaque page : tableau filtrable, dialog de creation/edition, badges de statut, design pro coherent avec l'existant.

## 3. Navigation et routing

- **Sidebar** : nouveau groupe "Pilotage SMQ" avec les 5 entrees
- **App.tsx** : 5 nouvelles routes protegees par `RoleGuard allowedRoles={["admin", "rmq"]}` pour edition, consultation ouverte a tous les authentifies
- Tous les roles voient le menu, mais les boutons d'ajout/modification sont masques pour les non-admin/rmq

## 4. Design

- Meme pattern que les pages existantes (Cards, Tables, Dialogs, Badges)
- Sections ISO numerotees dans les en-tetes
- Couleurs de statut coherentes avec le reste de l'application

## Ordre d'implementation

1. Migration SQL (toutes les tables + RLS en une seule migration)
2. Pages dans l'ordre : PolitiqueQualite → RevueDirection → Competences → SatisfactionClient → Fournisseurs
3. Sidebar + Routes

