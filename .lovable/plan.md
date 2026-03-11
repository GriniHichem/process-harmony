

# Decisions & Actions structurées pour la Revue de Direction

## Concept

Remplacer les champs texte riche "Décisions" et "Actions décidées" par un systeme structuré similaire aux "Éléments d'entrée", avec en plus :

1. **Decisions libres** : saisir un texte de decision sans lien
2. **Decisions liées a un element d'entree** : selectionner un element d'entree existant de cette revue et y associer une decision
3. **Actions depuis les elements liés** : pour les elements d'entree de type risque, indicateur, enjeu (qui ont des moyens/actions dans l'app), pouvoir importer directement ces actions existantes comme decisions/actions de la revue -- evitant la double saisie
4. **Responsable + echeance** : chaque decision/action peut avoir un responsable (acteur) et une echeance

## Schema de donnees

Nouvelle table `review_decisions` :

| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| review_id | uuid FK → management_reviews | |
| input_item_id | uuid FK → review_input_items (nullable) | Lien vers l'element d'entree source |
| type | text | "decision" ou "action" |
| description | text | Texte de la decision/action |
| responsable_id | uuid (nullable) | FK vers acteurs |
| echeance | date (nullable) | |
| statut | text | "a_faire", "en_cours", "terminee" |
| source_entity_type | text (nullable) | Type d'entite source (risk_action, indicator_action, etc.) |
| source_entity_id | uuid (nullable) | ID de l'action/moyen source importee |
| ordre | integer | |
| created_at, updated_at | timestamptz | |

RLS : SELECT pour tous authenticated, INSERT/UPDATE pour admin+rmq, DELETE pour admin.

## Nouveau composant `ReviewDecisions.tsx`

### Fonctionnalites

1. **Liste structuree** des decisions et actions avec badges type, statut, responsable, echeance
2. **Ajout libre** : saisir description + type (decision/action) + responsable + echeance
3. **Ajout depuis element d'entree** : selecteur listant les review_input_items de cette revue, avec possibilite de creer une decision/action liee
4. **Import d'actions existantes** : quand un element d'entree est de type risque/indicateur/enjeu, charger les actions/moyens associes (risk_actions, indicator_actions, context_issue_actions) et permettre de les importer en un clic comme action de la revue
5. **Vue lecture** pour le dialog de consultation

### Entites avec actions importables

| Element d'entree type | Table source actions | Champs |
|---|---|---|
| risque | risk_actions + risk_moyens | description, responsable, deadline, statut |
| indicateur | indicator_actions + indicator_moyens | description, responsable, deadline, statut |
| enjeu | context_issue_actions | description, responsable, statut |

## Modifications dans RevueDirection.tsx

- Remplacer les sections "Decisions" et "Actions decidees" (actuellement RichTextEditor) par `ReviewDecisionsEditor` avec filter type="decision" / type="action"
- Ou combiner en une seule section "Decisions & Actions" avec onglets/filtres
- Vue consultation : afficher les decisions/actions structurees avec statut, responsable, lien vers l'element source

## Fichiers impactes

1. **Migration SQL** : creer `review_decisions` + RLS + updated_at trigger
2. **Nouveau composant** : `src/components/ReviewDecisions.tsx`
3. **Modifier** : `src/pages/RevueDirection.tsx` -- integrer le composant, mettre a jour sidebar et vue consultation

