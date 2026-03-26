

# Module Modèles de sondage — Satisfaction client

## Vue d'ensemble

Ajouter un système complet de modèles (templates) de sondage au module satisfaction client. Les modèles contiennent des sections et des questions réutilisables. Lors de la création d'un sondage, l'utilisateur choisit un modèle ou part de zéro. Un modèle par défaut ISO 9001 (qualité produits-services, délais, prix) est pré-intégré avec double évaluation (absolue + concurrence).

## Phase 1 — Base de données (migration SQL)

### Tables à créer

**`survey_templates`**
- `id`, `name`, `code`, `version` (integer, default 1), `description`, `type` (text), `status` (text: actif/inactif/brouillon), `is_default` (boolean), `notes_internes` (text), `created_by` (uuid → profiles), `updated_by` (uuid → profiles), `created_at`, `updated_at`

**`survey_template_sections`**
- `id`, `template_id` (FK → survey_templates ON DELETE CASCADE), `title`, `code`, `description`, `order_index` (integer), `is_active` (boolean, default true)

**`survey_template_questions`**
- `id`, `section_id` (FK → survey_template_sections ON DELETE CASCADE), `label` (text), `question_type` (text: satisfaction/text/rating/nps/yes_no/multiple_choice/absolute_relative), `order_index`, `has_absolute_evaluation` (boolean), `has_competitor_evaluation` (boolean), `has_observation_absolute` (boolean), `has_observation_relative` (boolean), `is_required` (boolean), `options` (jsonb), `poids` (numeric, default 1)

**Colonnes ajoutées à `client_surveys`**
- `template_id` (uuid nullable FK → survey_templates), `template_version` (integer nullable), `template_name` (text nullable), `client` (text), `process_id` (uuid nullable FK → processes), `survey_date` (date)

**`survey_answers`** (pour le nouveau système d'évaluation absolue/relative)
- `id`, `survey_id` (FK → client_surveys), `question_label` (text), `section_title` (text), `absolute_rating` (numeric), `absolute_observation` (text), `relative_rating` (numeric), `relative_observation` (text), `created_at`

### RLS
- Toutes les tables en RLS activée
- Lecture pour `authenticated` 
- Écriture/modification/suppression limitée via `has_role(auth.uid(), 'admin')` OR `has_role(auth.uid(), 'rmq')`

### Modèle par défaut (seed via migration)
Inséré avec `ON CONFLICT DO NOTHING` sur le code :
- **Template** : "Enquête satisfaction client standard", code `TPL-SAT-001`, version 1, type `satisfaction_client`, `is_default = true`
- **Section A** : "Qualité produits-services" (3 questions : clauses contractuelles, réactivité réclamations, contrôle fournisseur)
- **Section B** : "Délais d'exécution" (3 questions : respect délais, réactivité urgent, moyens supplémentaires)
- **Section C** : "Prix d'exécution" (3 questions : écart prix/contrat, rapport qualité/prix, travaux imprévus)

Chaque question a `has_absolute_evaluation = true`, `has_competitor_evaluation = true`, `has_observation_absolute = true`, `has_observation_relative = true`.

Seuils de notation intégrés dans l'UI (pas en base) : Satisfaisant ≥ 80, Moyen 50-80, Insuffisant < 50.

## Phase 2 — UI : Onglet "Modèles" dans SatisfactionClient

### Modification de `src/pages/SatisfactionClient.tsx`
- Ajouter un 4e onglet "Modèles" avec icône `FileStack`
- Contenu : composant `<SurveyTemplateManager />`

### Nouveau composant : `src/components/SurveyTemplateManager.tsx`

**Liste des modèles** (tableau) :
| Nom | Code | Version | Type | Statut | Par défaut | Créé le | Actions |

**Actions** : Voir, Modifier, Dupliquer, Archiver, Définir par défaut

**Dialog d'édition** (maximisable comme SurveyBuilder) :
- Formulaire : nom, code, version, type, statut, description, notes internes
- Éditeur de sections (ajout/suppression/réordonnement/activation)
- Éditeur de questions par section (ajout/suppression/réordonnement/duplication)
- Chaque question : label, type, pondération, flags (évaluation absolue, concurrence, observations)
- Bouton "Prévisualiser" pour afficher le rendu du formulaire

## Phase 3 — Wizard de création de sondage depuis modèle

### Modification du flux "Nouveau sondage"

Quand l'utilisateur clique "Nouveau sondage" :
1. **Dialog de choix** avec 2 options :
   - "Sondage vide" → ouvre le SurveyBuilder existant
   - "À partir d'un modèle" → affiche la liste des templates actifs

2. Si modèle choisi, **dialog wizard** :
   - Étape 1 : Choisir client (texte libre), processus (select depuis table `processes`), date
   - Étape 2 : Aperçu du modèle sélectionné
   - Étape 3 : Générer → copie toutes les sections/questions dans `client_surveys` + `client_survey_questions`, enregistre `template_id`, `template_version`, `template_name`

Le sondage généré est **autonome** : modification du template ultérieure n'affecte pas les sondages existants.

## Phase 4 — Affichage enrichi

- Dans la liste des sondages, afficher le badge "Modèle : TPL-SAT-001 v1" quand `template_id` est renseigné
- Dans les résultats, calcul automatique des moyennes par section avec indicateurs Ia (absolu) et Ir (relatif)

## Fichiers créés/modifiés

| Fichier | Action |
|---|---|
| `supabase/migrations/xxx_survey_templates.sql` | Créer tables, RLS, seed modèle par défaut |
| `src/components/SurveyTemplateManager.tsx` | Nouveau — gestion complète des templates |
| `src/components/SurveyTemplateEditor.tsx` | Nouveau — éditeur sections/questions |
| `src/components/SurveyFromTemplateWizard.tsx` | Nouveau — wizard création depuis modèle |
| `src/pages/SatisfactionClient.tsx` | Ajouter onglet Modèles + dialog de choix "vide ou modèle" |

## Contraintes respectées

- Migrations idempotentes (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- RLS avec `has_role()` security definer
- Pas de hardcoding d'URLs
- Versioning des templates (le sondage mémorise la version source)
- Interface cohérente avec le design system existant (Card, Dialog, Table, Badge, Select)

