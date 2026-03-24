

# Logigramme en portrait quand BPMN désactivé

## Contexte

Actuellement, si `inclure_bpmn_pdf` est activé, le BPMN s'affiche en dernière page en paysage. Si désactivé, rien ne s'affiche. L'utilisateur veut que, quand le BPMN est désactivé, le **logigramme** (flowchart des activités) soit inséré en mode **portrait (A4)** juste après la section "Activités du processus".

## Approche

### 1. Créer `src/lib/renderFlowchartSvgString.ts`

Nouveau fichier qui produit un SVG statique (string) du logigramme, similaire à `renderBpmnSvgString.ts` mais pour les tâches du processus. Il réutilisera la logique de layout de `ProcessTasksFlowchart.tsx` :

- Extraire et adapter `computeLayout()` en version standalone (sans dépendance React)
- Rendre les formes : cercle start/end, cartes d'activité (rectangles arrondis avec code + description), losanges gateway, flèches
- Simplifier le rendu : pas de foreignObject, pas d'interactivité, pas de hover — juste des `<rect>`, `<text>`, `<polygon>`, `<path>`
- Calculer automatiquement le viewBox pour adapter le contenu à une largeur portrait (~170mm)

### 2. Modifier `src/lib/exportProcessPdf.ts`

- Dans `fetchAllProcessData()` : toujours charger les tasks et elements (déjà fait)
- Dans `buildHtml()` :
  - **Si BPMN activé** : garder le comportement actuel (BPMN en dernière page, paysage)
  - **Si BPMN désactivé** : insérer le SVG du logigramme juste **après** la section "Activités du processus", en portrait, avec un titre "Logigramme du processus"
  - Le logigramme reste dans le flux portrait normal (pas de page-break sauf si nécessaire pour la taille)

## Fichiers

| Fichier | Action |
|---|---|
| `src/lib/renderFlowchartSvgString.ts` | **Créer** — rendu SVG statique du logigramme |
| `src/lib/exportProcessPdf.ts` | **Modifier** — intégrer le logigramme portrait après les activités quand BPMN désactivé |

## Détails techniques du rendu SVG statique

Le logigramme statique inclura :
- Cercle vert "Début" et cercle rouge "Fin"
- Cartes d'activités : rectangle arrondi avec code en gras + description, couleur de bordure par responsable
- Losanges gateway (×, +, ○) pour les flux conditionnels/parallèles/inclusifs
- Flèches orthogonales entre les éléments avec labels de condition
- Pas de données d'entrée/sortie par tâche (trop détaillé pour le PDF) — juste le flux principal

