

# Plan : Planning Gantt plein écran avec panneau latéral de détails

## Probleme actuel
- Le panneau de détails s'affiche en bas du Gantt, peu pratique
- Pas de mode plein écran dédié
- Pas de commentaires depuis le planning

## Architecture

Le Gantt passera en **plein écran dédié** (même principe que le logigramme `/processus/:id/logigramme`). Le panneau de focus sera déplacé dans une **barre latérale droite** avec ResizablePanelGroup. Les commentaires seront intégrés dans cette barre.

```text
┌──────────────────────────────────────────────────────────┐
│ Header: ← Retour  |  Titre projet  |  Légende statuts   │
├──────────────────────────────────┬───────────────────────┤
│                                  │  Détails élément      │
│   Gantt Chart (pleine largeur)   │  - Statut/badges      │
│   - Lignes mois                  │  - Période            │
│   - Barres + today marker        │  - Avancement         │
│   - Clic → focus                 │  - Responsable        │
│                                  │  - Enfants cliquables │
│                                  │  - Commentaires       │
│                                  │                       │
├──────────────────────────────────┴───────────────────────┤
```

## Changements prévus

### 1. Nouvelle page `src/pages/ProjectPlanningPage.tsx`
- Route : `/actions/:projectId/planning`
- Charge le projet + ganttItems (même logique que ProjectDetail)
- Header avec bouton retour, titre projet, badge statut
- Rendu plein écran `h-screen` sans layout (comme ProcessFlowchartPage)

### 2. Refonte `ProjectGanttChart.tsx`
- **Supprimer** le `renderFocusPanel()` en bas
- **Ajouter** ResizablePanelGroup horizontal :
  - Panel gauche : le Gantt (rows + header months)
  - Panel droit (conditionnel, quand focusedItem) : panneau de détails
- **Panneau droit** : détails complets (statut, période, avancement, responsable, poids, enfants cliquables) + section commentaires via `ProjectActionComments`
- **Props** : ajouter `canComment`, `isAdmin`, `projectId` pour les commentaires
- **UI premium** : meilleure lisibilité des barres, couleurs de statut plus visibles, typographie améliorée, scrollbar du Gantt en `h-full`

### 3. Mise a jour `App.tsx`
- Ajouter route `/actions/:projectId/planning`

### 4. Mise a jour `ProjectDetail.tsx` et `Actions.tsx`
- Tab "Planning" : remplacer le Gantt inline par un bouton/lien "Ouvrir le planning" qui navigue vers `/actions/:projectId/planning`
- Dans `Actions.tsx` tab Planning : afficher les ProjectCards avec un lien vers le planning de chaque projet

### 5. Ameliorations UI
- Barres Gantt plus hautes (h-6 au lieu de h-5) avec labels statut lisibles
- Alternance de fond sur les lignes (zebra striping)
- Légende des statuts dans le header
- Today marker avec label "Aujourd'hui"
- Animation slide-in pour le panneau droit

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/pages/ProjectPlanningPage.tsx` | **Nouveau** — page plein écran |
| `src/components/projects/ProjectGanttChart.tsx` | Refonte : ResizablePanelGroup + panneau latéral + commentaires |
| `src/App.tsx` | Nouvelle route |
| `src/pages/ProjectDetail.tsx` | Lien vers planning plein écran |
| `src/pages/Actions.tsx` | Lien vers planning plein écran |

