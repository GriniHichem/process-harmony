

# Éléments d'entrée structurés pour la Revue de Direction

## Concept

Transformer le champ "Éléments d'entrée" d'un simple éditeur de texte en une **liste structurée d'items**, où chaque item peut être :
- Un **point libre** (texte saisi manuellement)
- Un **lien vers un objet existant** de l'application (processus, indicateur, risque, audit, NC, action, document, incident, enjeu, fournisseur, satisfaction client, compétence)

Chaque élément peut aussi avoir des **sous-éléments** (enfants), permettant une structure parent/fils.

## Schema de données

Nouvelle table `review_input_items` :

| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| review_id | uuid FK → management_reviews | Revue parente |
| parent_id | uuid FK → review_input_items (nullable) | Pour la hiérarchie parent/fils |
| ordre | integer | Tri |
| type | text | "libre", "processus", "indicateur", "risque", "audit", "nc", "action", "document", "incident", "enjeu", "fournisseur", "satisfaction", "competence" |
| label | text | Texte affiché / titre libre |
| entity_id | uuid (nullable) | ID de l'objet lié si type != "libre" |
| commentaire | text | Notes additionnelles |
| created_at, updated_at | timestamptz | |

RLS : SELECT pour tous authenticated, INSERT/UPDATE pour admin+rmq, DELETE pour admin.

## Composant `ReviewInputItems`

Un nouveau composant qui affiche la liste des éléments d'entrée avec :

1. **Liste hiérarchique** : items parents avec indentation pour les enfants
2. **Ajout d'un point libre** : champ texte simple
3. **Ajout d'un lien vers une entité** : sélecteur de type d'entité → puis recherche/sélection de l'objet spécifique
4. **Affichage enrichi** : badge coloré par type, nom de l'entité liée, icone, lien cliquable
5. **Sous-éléments** : bouton "Ajouter un sous-élément" sur chaque item parent
6. **Drag ou boutons ordre** : réorganiser les items

### Entités linkables

| Type | Source table | Label affiché |
|---|---|---|
| processus | processes | code + nom |
| indicateur | indicators | nom |
| risque | risks_opportunities | description |
| audit | audits | reference |
| nc | nonconformities | reference |
| action | actions | description |
| document | documents | titre |
| incident | riskIncidents | description |
| enjeu | context_issues | intitule |
| fournisseur | suppliers | nom |
| satisfaction | satisfaction_surveys | titre |
| competence | competences | competence |

## Modifications dans RevueDirection.tsx

- Remplacer la section "Éléments d'entrée" (actuellement RichTextEditor) par le composant `ReviewInputItems`
- Le champ `elements_entree` de la table `management_reviews` reste pour le texte libre résumé, mais les items structurés sont dans la nouvelle table
- Dans la vue consultation, afficher les items liés avec badges et navigation

## Fichiers impactés

1. **Migration SQL** : créer `review_input_items` + RLS
2. **Nouveau composant** : `src/components/ReviewInputItems.tsx` — gestion CRUD des items avec sélecteur d'entités
3. **Modifier** : `src/pages/RevueDirection.tsx` — intégrer le composant dans la section "Éléments d'entrée" et dans la vue consultation

