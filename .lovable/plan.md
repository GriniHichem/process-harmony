

# Plan : Nettoyage automatique à l'import CSV + BPMN 2.0 avec next_activity_code et navigation

## 1) Import CSV — Nettoyage complet avant import

### Problème
Actuellement, l'import CSV supprime les `process_tasks` existantes (ligne 267) mais **ne supprime pas les entrées/sorties** (`process_elements` de type `donnee_entree`/`donnee_sortie`). L'utilisateur doit manuellement les supprimer avant chaque import.

### Solution
Dans `handleImport()` de `CsvTaskImporter.tsx`, avant d'insérer les nouvelles tâches :
1. Supprimer tous les `process_elements` de type `donnee_entree` et `donnee_sortie` pour ce processus
2. Supprimer les `process_tasks` (déjà fait)
3. Recréer les éléments entrées/sorties depuis le CSV (déjà fait)

Ajouter un avertissement clair dans le dialogue de preview : "Les entrées, sorties et activités existantes seront toutes supprimées et remplacées."

### Fichier
`src/components/CsvTaskImporter.tsx` — ajouter un `DELETE` sur `process_elements` filtré par `type IN ('donnee_entree', 'donnee_sortie')` et `process_id` avant l'insert.

---

## 2) BPMN — Ajouter `next_activity_code` dans la génération

### Problème
`generateBpmnFromTasks()` dans `src/lib/generateBpmnFromTasks.ts` ne prend pas en compte le champ `next_activity_code`. Les flèches de saut personnalisées ne sont pas générées dans le diagramme BPMN.

### Solution
- Ajouter `next_activity_code` à l'interface `TaskInput`
- Après la génération du flux principal, parcourir les tâches avec `next_activity_code` rempli et ajouter des edges supplémentaires (type `"association"` ou un nouveau type) pointant vers le nœud cible
- Maintenir un mapping `code → nodeId` pour résoudre les cibles
- Le `doGenerate()` dans `Bpmn.tsx` passe déjà toutes les colonnes de `process_tasks`, mais il faut ajouter `next_activity_code` au mapping

### Fichiers
- `src/lib/generateBpmnFromTasks.ts` — ajouter `next_activity_code` à `TaskInput`, générer les edges de saut
- `src/pages/Bpmn.tsx` — ajouter `next_activity_code` dans le mapping des tâches vers `TaskInput`

---

## 3) BPMN — Migrer le système de navigation (Précédente/Suivante)

### Problème
La page BPMN (`Bpmn.tsx`) n'a aucune navigation entre activités (pas de boutons Précédente/Suivante, pas de focus, pas de popover conditionnel). Seul le logigramme des activités (`ProcessTasksFlowchart`) dispose de ce système.

### Solution
Ajouter dans `BpmnToolbar.tsx` et `Bpmn.tsx` un système de navigation identique :
- Boutons ◀ / ▶ dans la toolbar BPMN
- Liste déroulante de saut direct (comme le popover actuel)
- Navigation intelligente par type de flux : XOR → popover choix, AND/OR → branches séquentielles
- Focus sur le nœud BPMN correspondant avec zoom 1.1x et pan centré
- Réutiliser la même logique `buildNavPath` / `findNextStep` / `findPrevStep`
- Glow/highlight sur le nœud sélectionné dans `BpmnCanvas`

### Fichiers
| Fichier | Changement |
|---|---|
| `src/components/bpmn/BpmnToolbar.tsx` | Boutons navigation ◀ ▶, sélecteur activité, popover gateway |
| `src/pages/Bpmn.tsx` | State navigation, `buildNavPath`, handlers prev/next/jump, zoom/pan focus |
| `src/components/bpmn/BpmnCanvas.tsx` | Highlight/glow sur le nœud focalisé (filtre SVG), prop `focusedNodeId` |

---

## Résumé des fichiers impactés

| Fichier | Changement |
|---|---|
| `src/components/CsvTaskImporter.tsx` | Suppression automatique entrées/sorties avant import |
| `src/lib/generateBpmnFromTasks.ts` | Support `next_activity_code` → edges de saut |
| `src/pages/Bpmn.tsx` | Passer `next_activity_code`, ajouter navigation intelligente |
| `src/components/bpmn/BpmnToolbar.tsx` | Boutons navigation + sélecteur d'activité |
| `src/components/bpmn/BpmnCanvas.tsx` | Glow/focus sur nœud sélectionné |

