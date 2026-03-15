

## Plan : Refonte du module Compétences & Formations (ISO 9001 §7.2)

### Probleme actuel

1. **Assignation par acteur (fonction), pas par utilisateur** -- Un acteur peut avoir plusieurs utilisateurs rattachés. Actuellement on assigne une compétence/formation à un acteur (fonction), mais on ne sait pas quel utilisateur spécifique est concerné.
2. **Aucun tableau de bord** -- Pas de KPIs, pas de statistiques, pas de vue d'ensemble.
3. **Pas de suivi budgétaire** -- Aucun champ coût, pas de budget formation, pas de consommation.
4. **Pas de filtres ni recherche** -- Tables brutes sans possibilité de filtrer par utilisateur, niveau, période.
5. **Pas de matrice visuelle** -- La "matrice des compétences" est juste un tableau plat, pas une vraie matrice croisée utilisateurs x compétences.

### Solution

#### 1. Migration SQL -- Ajouter `profile_id` + champs budgétaires

**Tables `competences` et `formations`** : ajouter `profile_id uuid REFERENCES profiles(id)` (nullable pour rétrocompatibilité). Quand on crée une compétence/formation, on choisit d'abord l'acteur (fonction), puis l'utilisateur rattaché à cet acteur.

**Table `formations`** : ajouter `cout numeric DEFAULT 0` (coût de la formation).

**Nouvelle table `budget_formation`** : `id, annee integer, budget_prevu numeric, created_at, updated_at` -- permet de définir le budget annuel et de calculer la consommation.

RLS : mêmes politiques que `competences`/`formations` (admin + rmq en écriture, authenticated en lecture).

#### 2. Sélection Acteur → Utilisateur dans les formulaires

Dans les dialogs compétence et formation :
- Etape 1 : Sélectionner un acteur (fonction) -- comme actuellement
- Etape 2 : Sélectionner un utilisateur parmi ceux rattachés à cet acteur (query `profiles` WHERE `acteur_id = selected_acteur_id`)
- Si un seul utilisateur est rattaché, il est auto-sélectionné
- Le champ `profile_id` est enregistré en plus de `acteur_id`

Affichage dans les tables : "Prénom Nom (Fonction)" au lieu de juste "Fonction".

#### 3. Onglet Tableau de bord (nouvel onglet)

Ajouter un 3e onglet "Tableau de bord" avec :

**KPIs en cartes** :
- Total compétences evaluées
- Evaluations en retard (prochaine_evaluation < today)
- Formations réalisées (année en cours)
- Taux d'efficacité (% formations efficaces)
- Budget consommé / Budget prévu (avec barre de progression)

**Graphiques** (recharts, composants existants dans `chart.tsx`) :
- Répartition des niveaux de compétence (donut : débutant/intermédiaire/avancé/expert)
- Formations par mois (bar chart, année en cours)
- Consommation budget cumulée vs budget (line chart)
- Efficacité des formations (pie chart : efficace/non efficace/non évaluée)

#### 4. Filtres et recherche

Ajouter au-dessus de chaque table :
- Recherche textuelle (compétence, titre formation, nom utilisateur)
- Filtre par acteur/fonction
- Filtre par niveau (compétences) ou efficacité (formations)
- Filtre par période (année)

#### 5. Matrice croisée des compétences

Nouvelle vue optionnelle dans l'onglet Compétences : matrice où les lignes sont les utilisateurs et les colonnes les compétences distinctes, avec des badges de niveau colorés dans chaque cellule. Permet de visualiser rapidement les gaps.

### Fichiers impactes

| Fichier | Modification |
|---|---|
| Migration SQL | `profile_id` sur competences + formations, `cout` sur formations, table `budget_formation` |
| `src/pages/Competences.tsx` | Refonte complete : 3 onglets (Dashboard, Competences, Formations), filtres, sélection utilisateur, matrice, graphiques budget |

### Ordre d'execution
1. Migration SQL (nouvelles colonnes + table budget)
2. Refonte `Competences.tsx` (dashboard + filtres + sélecteur utilisateur + matrice + budget)

