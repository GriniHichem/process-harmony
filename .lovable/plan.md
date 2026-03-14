

# Analyse complète — Conditions sur les gateways

## Problemes identifies dans le code actuel

### 1. `FlowchartEdge` (ligne 256) — Labels mal positionnés
Le label de condition est placé avec `textAnchor="end"` à `Math.min(fromX, toX) - 8`. Sur un edge qui va du centre du gateway vers une branche décalée horizontalement, le label finit à gauche du diagramme, souvent invisible ou superposé.

### 2. `GatewayShape` (ligne 280-284) — Description mal utilisée
La description de la tâche-gateway (ex: "Vérifier conformité") s'affiche à droite du losange comme texte brut. Pour XOR/OR, cela devrait être une **question de décision** stylée. Pour AND, pas de question nécessaire.

### 3. `FlowchartNodeEditor` (ligne 138) — Condition visible pour AND
Le champ "Condition" s'affiche pour **toutes** les branches (`isBranch || task?.parent_code`), y compris AND. En BPMN, les branches AND s'exécutent **toutes** — pas de condition.

### 4. Pas de flux par défaut (XOR)
En BPMN, un gateway XOR doit avoir un flux "par défaut" (SINON) visuellement distinct. Actuellement, si une branche n'a pas de condition, rien ne l'indique.

### 5. Prop manquante — `parentFluxType`
Le `FlowchartNodeEditor` ne reçoit pas le type de flux du parent. Il faut transmettre cette info pour masquer le champ condition quand le parent est `parallele`.

## Plan de correction

### Fichier 1 : `FlowchartNodeEditor.tsx`

**Ajouter prop `parentFluxType`** :
- Nouvelle prop optionnelle `parentFluxType?: TaskFlowType`
- Si `parentFluxType === "parallele"` → masquer complètement le champ "Condition"
- Si `parentFluxType === "conditionnel"` → placeholder "Ex: SI conforme, SINON..." (actuel)
- Si `parentFluxType === "inclusif"` → placeholder "Ex: SI urgent, SI critique..."

### Fichier 2 : `ProcessTasksFlowchart.tsx`

**A. Passer `parentFluxType` au `FlowchartNodeEditor`**
- Quand `openAddDialog(parentCode)` → chercher la tâche parent, stocker son `type_flux`
- Quand `openEditDialog(task)` → si `task.parent_code`, chercher le parent et stocker son `type_flux`
- Nouveau state `editorParentFluxType: TaskFlowType | null`

**B. Refactorer `GatewayShape`** — Bulle de décision
- Pour XOR et OR (non-merge) : ajouter un `foreignObject` sous le losange avec la description dans une bulle jaune/orange (question de décision)
- Pour AND : garder juste le losange avec `+`, pas de bulle
- Supprimer le texte brut actuel à droite du losange

**C. Refactorer `FlowchartEdge`** — Labels repositionnés
- Positionner le label de condition au **milieu du premier segment** de l'edge (entre gateway et branche)
- Style : badge arrondi avec fond semi-transparent coloré selon le type de flux
- Pour les edges XOR sans condition : afficher "Sinon" avec style distinct (fond gris, texte italique)
- Ajouter un petit trait barré (`/`) sur l'edge du flux par défaut (convention BPMN standard)

**D. Détecter le flux par défaut XOR**
- Dans `computeLayout`, enrichir les `LayoutEdge` avec `isDefault?: boolean` et `flowType?: TaskFlowType`
- Logique : pour un gateway XOR, si une branche n'a pas de `condition`, marquer son edge comme `isDefault = true`
- Passer `flowType` du gateway à chaque edge pour le styling

### Modifications au type `LayoutEdge`

```typescript
interface LayoutEdge {
  fromX: number; fromY: number; toX: number; toY: number;
  label?: string; dashed?: boolean;
  isDefault?: boolean;   // ← nouveau : flux par défaut XOR
  flowType?: TaskFlowType; // ← nouveau : pour le style du badge
}
```

## Résumé des risques vérifiés

| Risque | Statut |
|--------|--------|
| Prop manquante `parentFluxType` | Corrigé en ajoutant state + prop |
| Positionnement label sur edge vertical→horizontal | Calcul au milieu du segment horizontal |
| Détection default path pour XOR | Logique simple : pas de condition = default |
| Branches AND ne doivent pas avoir de conditions | Champ masqué dans l'éditeur |
| Bulle question ne doit pas apparaitre sur merge gateways | Condition `!gw.isMerge` déjà en place |
| `foreignObject` dans SVG pour la bulle | Fonctionne avec le même pattern que les noeuds |

## Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/components/ProcessTasksFlowchart.tsx` | State `editorParentFluxType`, `LayoutEdge` enrichi, `GatewayShape` avec bulle, `FlowchartEdge` avec badges, détection flux défaut |
| `src/components/FlowchartNodeEditor.tsx` | Prop `parentFluxType`, masquage condition pour AND |

