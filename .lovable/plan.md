

# Plan: Refonte complète du module Satisfaction Client

## Contexte
Le module actuel `satisfaction_surveys` est une simple table CRUD. Il faut le transformer en un vrai système de sondages avec questionnaires dynamiques, lien public guest, collecte de réponses et analyse des résultats.

## Architecture de la base de données

### Nouvelles tables (migration)

```text
client_surveys (remplace satisfaction_surveys pour la partie sondage)
├── id, name, description, department, product_service
├── public_token (unique, pour lien public)
├── status (draft/active/closed)
├── created_at, created_by

client_survey_questions
├── id, survey_id (FK → client_surveys)
├── question_text, question_type (satisfaction/text/image/yes_no)
├── image_url (nullable, pour questions avec image)
├── ordre (int)

client_survey_responses
├── id, survey_id (FK → client_surveys)
├── respondent_name (nullable), created_at

client_survey_answers
├── id, response_id (FK → client_survey_responses)
├── question_id (FK → client_survey_questions)
├── answer_text, answer_value (int, nullable)

client_survey_comments  (pour catégorisation des commentaires)
├── id, response_id (FK), question_id (FK)
├── comment_text, category (amelioration/plainte/suggestion)
├── action_id (FK → actions, nullable)
```

### RLS
- `client_surveys`, `client_survey_questions`: SELECT pour authenticated, INSERT/UPDATE/DELETE pour rmq/admin
- `client_survey_responses`, `client_survey_answers`: INSERT pour **anon** (guest) + SELECT pour authenticated
- On garde la table `satisfaction_surveys` existante intacte (partie historique manuelle)

### Storage
- Bucket `survey-images` (public) pour les images des questions

## Routes & Pages

1. **`/satisfaction-client`** — Page principale avec 3 onglets (Tabs):
   - **Sondages**: Liste des sondages, création, gestion du lien public
   - **Résultats**: Tableau des résultats par sondage, scores, pourcentages
   - **Historique**: L'ancien tableau `satisfaction_surveys` (enquêtes manuelles)

2. **`/survey/:token`** — Page publique guest (hors `ProtectedRoute`):
   - Logo entreprise, titre, questions, bouton Envoyer
   - Message de remerciement après soumission
   - Aucune authentification requise

## Composants

### Page SatisfactionClient.tsx (refonte)
- 3 onglets via `<Tabs>`
- Onglet "Sondages": CRUD sondages + builder de questions
- Onglet "Résultats": sélection sondage → stats (nb réponses, score moyen, répartition satisfaction, commentaires catégorisés)
- Onglet "Historique": l'ancien tableau existant

### SurveyBuilder (nouveau composant)
- Dialog pour créer/éditer un sondage
- Section questions: ajout/réordonnement/suppression
- Types: satisfaction (5 niveaux), texte, image, oui/non
- Upload image via storage bucket

### SurveyPublicPage (nouvelle page)
- Route `/survey/:token` — publique, pas de layout app
- Fetch sondage par `public_token`
- Formulaire simple, responsive
- Soumission → message merci

### SurveyResults (nouveau composant)
- Sélection du sondage
- KPIs: nb réponses, taux de satisfaction calculé automatiquement
- Répartition par niveau (Très satisfait → Très insatisfait) en pourcentage
- Liste des commentaires avec catégorisation (amélioration/plainte/suggestion)
- Bouton "Créer action d'amélioration" depuis un commentaire → insert dans table `actions`

## Modifications App.tsx
- Ajouter route publique `/survey/:token` → `SurveyPublicPage` (sans `ProtectedRoute`)

## Edge function
- Pas nécessaire. Les réponses guest passent par RLS anon sur `client_survey_responses` et `client_survey_answers`.

## Calcul du taux de satisfaction
```
Taux = (nb "très satisfait" + nb "satisfait") / total réponses × 100
```
Calculé côté client à partir des `answer_value` (5=très satisfait, 4=satisfait, 3=neutre, 2=insatisfait, 1=très insatisfait).

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| Migration SQL | Créer 5 tables + RLS + bucket |
| `src/pages/SatisfactionClient.tsx` | Refonte complète avec 3 onglets |
| `src/components/SurveyBuilder.tsx` | Nouveau — création sondage + questions |
| `src/components/SurveyResults.tsx` | Nouveau — résultats + commentaires |
| `src/pages/SurveyPublicPage.tsx` | Nouveau — formulaire guest |
| `src/App.tsx` | Ajouter route publique `/survey/:token` |

