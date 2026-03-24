

# Refonte du logigramme statique PDF — Lisibilité et Entrées/Sorties

## Problèmes identifiés

1. **Texte illisible** : polices de 7-9px, cartes de 280×52px — beaucoup trop petit pour un PDF A4
2. **Entrées/Sorties absentes** : la version interactive affiche 3 colonnes (Entrées | Activité | Sorties) mais le rendu statique n'affiche que le code et la description
3. **Espace gaspillé** : le diagramme est centré sur x=300 alors que la page portrait fait ~170mm (~480pt) de large disponible

## Modifications dans `src/lib/renderFlowchartSvgString.ts`

### 1. Agrandir toutes les dimensions
- `CARD_W` : 280 → **460** (3 colonnes : 100 + 260 + 100)
- `CARD_H` : 52 → **dynamique** (min 90, adapté au contenu entrées/sorties)
- `GW_S` : 32 → **44**
- `CIRCLE_R` : 16 → **22**
- `V_GAP` : 50 → **70**
- `centerX` : 300 → **400**

### 2. Ajouter les entrées/sorties sur chaque carte
- Accepter `processElements` en paramètre supplémentaire
- Parser `task.entrees` et `task.sorties` (codes séparés par virgule)
- Rendre une carte à 3 colonnes en SVG pur :
  - **Colonne gauche** (fond bleu clair) : titre "Entrées" + liste des éléments
  - **Centre** : code en gras + description + responsable en bas
  - **Colonne droite** (fond vert clair) : titre "Sorties" + liste des éléments

### 3. Augmenter toutes les tailles de police
- Code : 8px → **11px**
- Description : 9px → **12px**
- Responsable : 7px → **10px**
- Labels gateway : 7.5px → **10px**
- Labels edges : 7px → **9px**
- Entrées/Sorties : **10px**
- Start/End : 8px → **11px**

### 4. Adapter le calcul de hauteur dynamique
- Fonction `calcCardHeight(task, processElements)` similaire à la version interactive
- Hauteur basée sur max(entrées.length, sorties.length) et longueur de la description

### 5. Mettre à jour la signature dans `exportProcessPdf.ts`
- Passer `processElements` au `renderFlowchartSvgString(tasks, acteurMap, processElements)`

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/lib/renderFlowchartSvgString.ts` | Refonte majeure : dimensions, 3 colonnes, polices |
| `src/lib/exportProcessPdf.ts` | Passer `processElements` à l'appel du renderer |

