

# Plan: Fiche d'implication par acteur (Dialog)

## Concept

Ajouter un bouton "Voir les implications" sur chaque ligne d'acteur (visible uniquement pour admin, rmq, auditeur). Au clic, un Dialog s'ouvre et affiche toutes les entites ou cet acteur est implique, groupees par categorie. Chaque element est cliquable et redirige vers la page de detail correspondante.

## Categories affichees

1. **Activites processus** - depuis `process_tasks` ou `responsable_id = acteur.id` -> affiche description (Nom processus). Clic -> `/processus/{process_id}`
2. **Actions & Moyens indicateurs** - depuis `indicator_actions` / `indicator_moyens` ou `responsable = acteur.id` -> affiche description (Nom indicateur - Nom processus). Clic -> `/indicateurs` avec selection de l'indicateur
3. **Actions & Moyens risques** - depuis `risk_actions` / `risk_moyens` ou `responsable = acteur.id` -> affiche description (Description risque - Nom processus). Clic -> `/risques`
4. **Actions enjeux contexte** - depuis `context_issue_actions` ou `responsable = acteur.id` -> affiche description (Intitule enjeu). Clic -> `/enjeux-contexte`

## Implementation

### Fichier: `src/components/ActeurImplicationsDialog.tsx` (nouveau)

- Props: `acteurId: string`, `acteurLabel: string`, `open: boolean`, `onOpenChange`
- Au mount, 5 requetes paralleles:
  - `process_tasks` (responsable_id = acteurId) + join processes pour le nom
  - `indicator_actions` (responsable = acteurId) + join indicators/processes
  - `indicator_moyens` (responsable = acteurId) + join indicators/processes  
  - `risk_actions` (responsable = acteurId) + join risks_opportunities/processes
  - `risk_moyens` (responsable = acteurId) + join risks_opportunities/processes
  - `context_issue_actions` (responsable = acteurId) + join context_issues
- Rendu: sections avec titres, listes cliquables avec `useNavigate()`
- Pour indicateurs: navigation avec query param `?indicator={id}` (necessitea une petite modification dans Indicateurs.tsx pour lire ce param)

### Fichier: `src/pages/Acteurs.tsx` (modifie)

- Ajouter un bouton icone (Eye/List) dans la colonne Actions, visible si `canViewImplications` (admin/rmq/auditeur)
- State pour `implicationActeurId`
- Integrer `<ActeurImplicationsDialog />`

### Fichier: `src/pages/Indicateurs.tsx` (modifie)

- Lire `searchParams.get("indicator")` au mount
- Si present, auto-selectionner cet indicateur dans la vue detail

### Fichier: `src/pages/Risques.tsx` (modifie)

- Lire `searchParams.get("risk")` au mount
- Si present, auto-expand ce risque

### Fichier: `src/pages/EnjeuContexte.tsx` (modifie)

- Lire `searchParams.get("issue")` au mount, passer a ContextIssuesManager pour auto-expand

## Section technique

Les requetes Supabase ne supportent pas les joins classiques sur ces tables (pas de FK declares). On fera donc des requetes separees puis un enrichissement cote client avec les maps processes/indicators/risks/issues chargees en parallele.

Navigation via `useNavigate()` + query params pour cibler l'element exact a afficher.

