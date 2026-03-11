

# Plan: Génération algorithmique de diagrammes BPMN

## Objectif
Générer automatiquement un diagramme BPMN à partir des données existantes du processus (activités/tâches, flux conditionnels/parallèles/inclusifs, entrées/sorties) via un algorithme déterministe -- sans IA.

## Données source disponibles

Les `process_tasks` contiennent tout le nécessaire :
- `code` : hiérarchie (1.0, 1.1, 1.2 pour les branches)
- `type_flux` : sequentiel, conditionnel, parallele, inclusif
- `condition` : texte de la condition (si/sinon)
- `parent_code` : code parent pour les branches
- `entrees` / `sorties` : codes des éléments DE/DS liés
- `ordre` : ordre séquentiel

Les `process_elements` fournissent les labels des entrées/sorties pour les annotations.

## Algorithme de génération

```text
1. Fetch process_tasks (triées par ordre) + process_elements
2. Grouper les tâches :
   - Tâches racines (parent_code = null) → flux principal
   - Tâches enfants → branches sous leur parent
3. Parcours séquentiel des tâches racines :
   - Tâche séquentielle → noeud "task"
   - Tâche conditionnelle (parent a des enfants conditionnel) →
     gateway-exclusive (XOR) + branches task + gateway-exclusive merge
   - Tâche parallèle → gateway-parallel (AND) + branches + merge
   - Tâche inclusif → gateway-inclusive (OR) + branches + merge
4. Layout automatique :
   - X : progression horizontale (espacement 200px)
   - Y : branches décalées verticalement (±100px par branche)
   - Start au début, End à la fin
5. Annotations : entrées/sorties ajoutées comme noeuds "annotation"
   reliés par edges en pointillé aux tâches correspondantes
```

## Détail du mapping

| Donnée source | Noeud BPMN généré |
|---|---|
| Début du flux | `start` |
| Tâche séquentielle | `task` |
| Groupe conditionnel | `gateway-exclusive` → N `task` branches → `gateway-exclusive` merge |
| Groupe parallèle | `gateway-parallel` → N `task` branches → `gateway-parallel` merge |
| Groupe inclusif | `gateway-inclusive` → N `task` branches → `gateway-inclusive` merge |
| Fin du flux | `end` |
| Entrées/Sorties significatives | `annotation` (optionnel) |

## Fichiers à modifier

### 1. Nouveau fichier : `src/lib/generateBpmnFromTasks.ts`
- Fonction pure `generateBpmnFromTasks(tasks, elements) → BpmnData`
- Logique :
  - Trier les tâches par `ordre`
  - Identifier les groupes de branches (tâches partageant le même `parent_code`)
  - Pour chaque tâche racine séquentielle : créer un noeud task, connecter au précédent
  - Pour chaque groupe de branches : créer gateway split + N noeuds task (avec label condition) + gateway merge
  - Positionner avec layout horizontal automatique, branches en éventail vertical
  - Ajouter start/end, connecter les edges

### 2. Modifier : `src/pages/Bpmn.tsx`
- Ajouter un bouton "Générer depuis les activités" (icône Wand2)
- Au clic : fetch `process_tasks` + `process_elements` pour le processus sélectionné
- Appeler `generateBpmnFromTasks()` → injecter le résultat dans le diagramme
- Si un diagramme existe déjà : confirmation avant remplacement
- Le résultat est modifiable normalement après génération

### 3. Modifier : `src/components/bpmn/BpmnToolbar.tsx`
- Ajouter le bouton "Générer" dans la toolbar (à côté de Sauvegarder)

## Exemple de résultat

Pour un processus avec :
- Tâche 1.0 (séquentiel) "Réception commande"
- Tâche 2.0 (conditionnel) avec branches 2.1 "Traiter standard" / 2.2 "Traiter urgent"
- Tâche 3.0 (séquentiel) "Expédition"

```text
[Start] → [Réception commande] → <XOR> → [Traiter standard] → <XOR merge> → [Expédition] → [End]
                                       → [Traiter urgent]   ↗
```

