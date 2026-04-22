
Objectif : fiabiliser complètement le calcul d’avancement des plans d’action, des actions multi-tâches et de leur affichage partout dans l’application.

## Diagnostic confirmé
Le problème n’est pas seulement visuel, il vient d’une logique éclatée à plusieurs endroits :

1. **Calcul de l’action multi-tâches**
   - `ProjectActionsList.tsx` recalcule l’action à partir de la moyenne des `project_tasks.avancement`.
   - Si une tâche est marquée “terminée/clôturée” mais garde un `avancement` incohérent, l’action hérite d’un mauvais pourcentage.

2. **Exemple vérifié**
   - L’action **“Mettre en place les indicateurs”** a actuellement **2 tâches à 50% / 50% et statut en_cours**, donc l’action reste logiquement à **50%** avec la formule actuelle.
   - Cela révèle surtout un vrai problème métier : le système mélange parfois **statut de tâche** et **pourcentage de tâche** sans les normaliser.

3. **Formules différentes selon les écrans**
   - `ProjectActionsList.tsx` calcule l’avancement projet avec une logique pondérée.
   - `ProjectPlanningPage.tsx` utilise une autre formule partielle.
   - `Actions.tsx` fait encore une moyenne simple des actions.
   - Résultat : **un même projet peut afficher 3 avancements différents selon la page**.

4. **Risque de données incohérentes**
   - Une tâche “terminée” peut rester à 50%.
   - Une tâche “à faire” peut garder un ancien pourcentage.
   - Une action multi-tâches peut être en `en_cours` avec 100%, ou inversement.

## Correctif à implémenter

### 1. Centraliser la logique métier d’avancement
Créer un helper partagé dans `src/lib/` pour avoir **une seule source de vérité** :

- normalisation de l’avancement d’une tâche selon son statut
- calcul d’avancement d’une action multi-tâches
- calcul d’avancement pondéré d’un projet

Règles prévues :
- tâche `a_faire` => 0%
- tâche `en_cours` => pourcentage réel borné entre 1 et 99
- tâche `termine` / `terminee` / `cloturee` => 100%
- action multi-tâches => moyenne des tâches **normalisées**
- projet => pondération unique avec support correct des poids fixes + poids auto

### 2. Corriger le recalcul des actions multi-tâches
Dans `ProjectActionsList.tsx` :
- remplacer `recalcActionFromTasks()` par un calcul basé sur les tâches normalisées
- éviter les incohérences statut/avancement
- conserver la règle métier existante : une action multi-tâches ne se clôture pas silencieusement sans validation, mais son pourcentage doit rester juste

### 3. Corriger tous les écrans qui affichent l’avancement projet
Mettre la même logique partout :
- `src/components/projects/ProjectActionsList.tsx`
- `src/pages/ProjectPlanningPage.tsx`
- `src/pages/Actions.tsx`
- `src/hooks/useDashboardStats.ts`
- si nécessaire `src/pages/ProjectDetail.tsx`

But :
- même projet = même avancement sur liste, détail, planning, dashboard

### 4. Ajouter une sécurisation des données au niveau base
Créer une migration pour nettoyer et sécuriser les données existantes :

- backfill des tâches incohérentes
  - `termine/terminee/cloturee` => `avancement = 100`
  - `a_faire` => `avancement = 0`
- trigger de normalisation sur `project_tasks`
  - pour empêcher qu’une tâche “terminée” reste à 50%
- si utile, recalcul initial des `project_actions.avancement` pour les actions multi-tâches existantes

Cela évite que le bug revienne si une donnée est modifiée ailleurs que depuis l’UI.

### 5. Rendre l’UI plus explicite
Dans `ProjectActionsList.tsx` :
- afficher clairement la règle “une tâche terminée vaut 100%”
- si une action est multi-tâches, afficher un texte de calcul cohérent
- si toutes les tâches sont terminées mais l’action n’est pas encore clôturée, afficher un état explicite au lieu d’un comportement ambigu

## Vérifications prévues
Je validerai les cas suivants :

1. **2 tâches terminées** → action = 100%
2. **1 tâche à 50 + 1 tâche à 100** → action = 75%
3. **2 tâches à faire** → action = 0%
4. **poids mixtes sur projet** → même résultat sur Planning, Détail, Liste et Dashboard
5. **ancienne donnée incohérente** (ex: statut terminé + 50%) → corrigée automatiquement

## Fichiers impactés
- `src/components/projects/ProjectActionsList.tsx`
- `src/pages/ProjectPlanningPage.tsx`
- `src/pages/Actions.tsx`
- `src/hooks/useDashboardStats.ts`
- `src/pages/ProjectDetail.tsx` si nécessaire
- `src/lib/...` nouveau helper de calcul
- `supabase/migrations/...` nouvelle migration de normalisation / backfill

## Résultat attendu
Après correction :
- une tâche clôturée comptera toujours comme **100%**
- une action multi-tâches affichera toujours le bon pourcentage
- le projet affichera le même avancement partout
- les anciennes incohérences de données seront réparées
- le bug ne reviendra plus à cause d’un mélange entre statut et pourcentage
