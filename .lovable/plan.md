

# Lien personnalisé "Activité suivante" sur les activités

## Problème
Actuellement, les flèches du logigramme suivent strictement l'ordre séquentiel (`ordre`). L'utilisateur veut pouvoir choisir manuellement quelle activité vient après une autre — par exemple, depuis l'activité 6-b2, pointer vers 5-a1 (retour arrière, boucle, saut).

## Ce qui va changer

### 1) Base de données — nouvelle colonne `next_activity_code`
Ajouter une colonne `next_activity_code TEXT` (nullable) sur `process_tasks`. Quand elle est remplie, le logigramme dessine une flèche vers cette activité au lieu de suivre l'ordre naturel.

### 2) Éditeur d'activité — sélecteur "Activité suivante"
Dans `FlowchartNodeEditor`, ajouter un champ `Select` listant toutes les activités du processus (sauf elle-même). Options :
- **"Suivant par défaut"** → `null` (suit l'ordre normal)
- **Liste des activités** → `code` de la cible (ex: `AP-005a1`)

Visible uniquement pour les activités de type **séquentiel** (les gateways gèrent déjà leurs propres branches).

### 3) Logigramme — flèche personnalisée
Dans `computeLayout()`, quand une tâche a `next_activity_code` rempli :
- Dessiner une flèche courbe/colorée depuis cette tâche vers la cible
- Style distinct : flèche en pointillé bleu avec un petit label "→ CODE"
- Remplace la flèche séquentielle par défaut vers le prochain nœud

### 4) CSV Import — nouvelle colonne optionnelle
Ajouter la colonne `activite_suivante` dans les instructions CSV. Si remplie, elle définit le `next_activity_code`.

## Fichiers impactés

| Fichier | Changement |
|---|---|
| Migration SQL | `ALTER TABLE process_tasks ADD COLUMN next_activity_code TEXT` |
| `src/components/FlowchartNodeEditor.tsx` | Nouveau sélecteur "Activité suivante" + prop `allTasks` |
| `src/components/ProcessTasksFlowchart.tsx` | Passer `allTasks` à l'éditeur, `onSave` inclut `next_activity_code`, `computeLayout` dessine flèche custom |
| `src/components/CsvTaskImporter.tsx` | Documenter colonne `activite_suivante` |
| `src/components/ProcessTasksTable.tsx` | Support `next_activity_code` dans le formulaire table |

