

# Refonte du module Satisfaction Client — Architecture logique et best practices

## Problèmes identifiés

1. **Onglet "Historique" incohérent** : il mélange la création d'enquêtes manuelles (ancien module `satisfaction_surveys`) avec les sondages modernes (`client_surveys`). L'utilisateur voit "Nouvelle enquête" dans Historique alors que les enquêtes et sondages devraient être unifiés.

2. **Sondages depuis modèle : pas de double évaluation** : Le wizard copie les questions en `question_type: "satisfaction"` (Likert 1-5) au lieu d'utiliser la logique absolue/concurrence du template. Les champs `has_absolute_evaluation` et `has_competitor_evaluation` sont ignorés.

3. **Résultats trop simples** : Pas de vue par section, pas de calcul Ia/Ir, pas de comparaison concurrence, pas de moyenne par section. Juste un taux global et une distribution Likert.

4. **Page publique sans notation par barème** : Le répondant choisit entre emojis (1-5) au lieu de noter sur 100 selon les seuils (Satisfaisant ≥80, Moyen 50-80, Insuffisant <50).

## Plan de refonte

### Phase 1 — Restructurer les onglets

**`SatisfactionClient.tsx`** : 3 onglets au lieu de 4
- **Sondages** : liste unifiée de tous les sondages (ancien `client_surveys` + ancien `satisfaction_surveys` via un badge "Manuel")
- **Résultats & Analyse** : vue enrichie avec section par section
- **Modèles** : inchangé

Supprimer l'onglet "Historique" séparé. Les anciennes enquêtes (`satisfaction_surveys`) apparaissent dans le même tableau avec un badge "Saisie manuelle".

### Phase 2 — Corriger la génération depuis modèle

**`SurveyFromTemplateWizard.tsx`** : Lors de la copie des questions du template vers `client_survey_questions`, préserver les métadonnées :
- Stocker `has_absolute_evaluation`, `has_competitor_evaluation` dans un champ JSON (`options` ou nouveau champ `evaluation_config` via migration)
- Conserver le nom de section dans un format structuré (`section_title` séparé de `question_text`)
- Utiliser `question_type: "absolute_relative"` au lieu de `"satisfaction"`

**Migration SQL** : Ajouter à `client_survey_questions` :
- `section_title` (text nullable) — pour regrouper les questions par section
- `evaluation_config` (jsonb nullable) — pour stocker `{ has_absolute: true, has_competitor: true, has_obs_absolute: true, has_obs_relative: true }`

### Phase 3 — Page publique avec notation sur 100

**`SurveyPublicPage.tsx`** : Quand `question_type === "absolute_relative"` :
- Afficher 2 colonnes : "Évaluation absolue" et "Évaluation / concurrence"
- Chaque colonne : un slider ou input numérique 0-100
- Sous chaque note : indicateur coloré automatique (vert ≥80, orange 50-80, rouge <50)
- Champ observation texte sous chaque colonne
- Sauvegarder dans `survey_answers` (table déjà créée) : `absolute_rating`, `relative_rating`, `absolute_observation`, `relative_observation`

### Phase 4 — Résultats détaillés avec Ia/Ir

**`SurveyResults.tsx`** : Refonte complète :
- **Sélection du sondage** avec badge template si applicable
- **KPI globaux** : Taux satisfaction, Ia moyen global, Ir moyen global, Nombre réponses
- **Tableau par section** :

```text
┌──────────────────────────────────────┬────────┬────────┬────────┬────────┐
│ Question                             │ Ia     │ Statut │ Ir     │ Statut │
├──────────────────────────────────────┼────────┼────────┼────────┼────────┤
│ A. Qualité produits-services         │        │        │        │        │
│   Respect clauses contractuelles     │ 85     │ ✅     │ 72     │ ⚠️     │
│   Réactivité réclamations            │ 60     │ ⚠️     │ 45     │ ❌     │
│   Moyenne section A                  │ 72.5   │ ⚠️     │ 58.5   │ ⚠️     │
├──────────────────────────────────────┼────────┼────────┼────────┼────────┤
│ B. Délais d'exécution                │        │        │        │        │
│   ...                                │        │        │        │        │
└──────────────────────────────────────┴────────┴────────┴────────┴────────┘
```

- **Graphique radar** : Ia vs Ir par section
- **Graphique barres** : comparaison Ia/Ir par question
- **Alertes** : questions où Ir < Ia (concurrence meilleure que nous)
- **Export CSV** des résultats détaillés

### Phase 5 — Corrections complémentaires

- **SurveyBuilder** : Pour les sondages classiques (non template), garder le système actuel (Likert, NPS, etc.)
- **Badge dans la liste** : Afficher clairement "ISO 9001" vs "Sondage libre" pour distinguer les types
- **Ancien module** : Migrer les données `satisfaction_surveys` en lectures seules dans le tableau principal

## Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| `supabase/migrations/xxx_survey_questions_sections.sql` | Ajouter `section_title`, `evaluation_config` à `client_survey_questions` |
| `src/pages/SatisfactionClient.tsx` | Fusionner onglets, supprimer Historique séparé |
| `src/components/SurveyFromTemplateWizard.tsx` | Copier métadonnées évaluation, type correct |
| `src/pages/SurveyPublicPage.tsx` | Ajouter rendu `absolute_relative` avec notation 0-100 |
| `src/components/SurveyResults.tsx` | Refonte : tableau par section, Ia/Ir, radar, alertes |

## Contraintes respectées

- Migrations idempotentes (`IF NOT EXISTS`, colonnes nullable)
- RLS existante suffisante (pas de nouvelles tables)
- `survey_answers` déjà créée, sera utilisée pour stocker les réponses double-évaluation
- Sondages classiques (Likert) continuent de fonctionner normalement
- Pas de modification des données existantes

