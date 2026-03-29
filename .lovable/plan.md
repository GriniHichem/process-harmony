

# Amélioration Résultats & Analyse — Vue détaillée réponse par réponse

## Problème actuel

Les résultats affichent uniquement des agrégats (moyennes, distributions) sans possibilité de consulter les réponses individuelles. Pour les sondages ciblés, les noms et emails des répondants ne sont pas visibles. Il manque des KPI avancés et un détail réponse par réponse.

## Modifications dans `src/components/SurveyResults.tsx`

### 1. Sous-onglets internes

Ajouter des sous-onglets dans la section résultats :
- **Synthèse** : KPI globaux + graphiques (vue actuelle enrichie)
- **Réponses individuelles** : liste de chaque réponse avec détail complet
- **Commentaires** : vue dédiée aux commentaires (déplacée depuis la vue actuelle)

### 2. KPI enrichis (synthèse)

Ajouter les KPI manquants :
- **Taux de réponse** : si sondage ciblé, nombre réponses / nombre invités
- **Meilleure question** : celle avec le score Ia le plus élevé
- **Question la plus faible** : score Ia le plus bas
- **Écart moyen Ia-Ir** : écart global entre performance absolue et concurrence
- **Nombre de questions en alerte** : count Ir < Ia

### 3. Onglet "Réponses individuelles"

**En-tête par répondant** (card expansible) :
- Nom du répondant (si sondage ciblé)
- Email du répondant (si sondage ciblé)
- Date de soumission
- Badge "Anonyme" si pas de nom/email

**Contenu détaillé** (au clic/expand) :
- Pour chaque question du sondage, afficher :
  - Libellé de la question
  - Section (si ISO)
  - Type de réponse
  - Valeur de la réponse (note satisfaction, texte, Ia/Ir avec indicateurs couleur)
  - Observations absolue et relative (si applicable)
- Score individuel du répondant (moyenne de ses notes)

**Pour les sondages ISO (absolute_relative)** :
- Charger les `survey_answers` par `survey_id` et les regrouper par répondant via le `response_id` ou la date
- Afficher tableau Ia/Ir par question pour chaque répondant

**Pour les sondages classiques** :
- Charger `client_survey_answers` via la relation `client_survey_responses`
- Afficher la note ou le texte pour chaque question

### 4. Filtres dans la vue réponses

- Recherche par nom/email
- Filtre par date de soumission
- Tri par date (récent/ancien) ou par score

### 5. Export CSV enrichi

Ajouter un export CSV des réponses individuelles (en plus de l'export synthèse existant) avec colonnes : Nom, Email, Date, Question, Section, Réponse, Ia, Ir, Observations.

### 6. Modification de la requête de données

Enrichir le fetch pour inclure :
- `survey_answers` regroupés par `response_id` (ajouter ce champ si manquant) ou par répondant
- Les champs `respondent_name` et `respondent_email` de `client_survey_responses`

## Migration SQL nécessaire

Aucune migration structurelle. La table `survey_answers` existe déjà mais n'a pas de `response_id` pour lier les réponses Ia/Ir à un répondant spécifique. Il faut ajouter :

```sql
ALTER TABLE survey_answers ADD COLUMN IF NOT EXISTS response_id uuid REFERENCES client_survey_responses(id) ON DELETE CASCADE;
```

Et mettre à jour `SurveyPublicPage.tsx` pour passer le `response_id` lors de la sauvegarde des `survey_answers`.

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `supabase/migrations/xxx.sql` | Ajouter `response_id` à `survey_answers` |
| `src/components/SurveyResults.tsx` | Sous-onglets, KPI enrichis, vue réponse par réponse, filtres, export |
| `src/pages/SurveyPublicPage.tsx` | Passer `response_id` lors de l'insertion des `survey_answers` |

