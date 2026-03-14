

# Messages d'orientation pour les gateways Parallèle et Inclusif

## Problème

Quand un utilisateur définit une activité avec un flux "Parallèle" ou "Inclusif", il faut au minimum 2 branches pour que le gateway ait un sens BPMN. Actuellement, rien n'indique à l'utilisateur qu'il doit ajouter des branches — le diagramme reste valide visuellement même avec 0 ou 1 branche.

## Solution : 3 niveaux de guidance non-bloquante

### 1. Indicateur visuel sur le gateway incomplet (flowchart)
Quand un gateway `parallele` ou `inclusif` a < 2 branches, afficher un petit badge d'avertissement (⚠) orange directement sur le losange dans le SVG, avec un tooltip au survol.

### 2. Toast d'orientation après sauvegarde
Quand l'utilisateur sauvegarde une activité avec type `parallele` ou `inclusif` et que le nombre de branches est < 2, afficher un toast info (non-bloquant) :
- Parallèle : "N'oubliez pas d'ajouter au moins 2 branches parallèles via le bouton + sur l'activité"
- Inclusif : "Ajoutez au moins 2 branches inclusives pour que la logique soit complète"

### 3. Hint dans l'éditeur (FlowchartNodeEditor)
Quand l'utilisateur sélectionne `parallele` ou `inclusif` comme type de flux, afficher un petit texte d'aide sous le sélecteur de type :
- "⚡ Ce type de flux nécessite au moins 2 branches pour être complet"

## Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/components/ProcessTasksFlowchart.tsx` | Badge ⚠ sur gateways incomplets + toast après sauvegarde |
| `src/components/FlowchartNodeEditor.tsx` | Texte d'aide contextuel sous le sélecteur de type de flux |

## Détails techniques

**Badge SVG sur gateway** : Dans le rendu des gateways (après `GatewayShape`), si `!gw.isMerge` et le nombre de branches (`branchMap.get(gw.code)?.length < 2`), ajouter un `foreignObject` avec une icône `AlertTriangle` et un titre tooltip.

**Toast après save** : Dans `handleSave`, après insertion réussie d'une activité root avec `type_flux !== "sequentiel"`, compter les branches existantes et afficher `toast.info(...)` si < 2.

**Hint éditeur** : Sous le `Select` de type de flux, conditionnel sur `typeFlux === "parallele" || typeFlux === "inclusif"`, afficher un `<p>` avec le message.

