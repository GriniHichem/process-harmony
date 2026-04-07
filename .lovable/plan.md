

# Amélioration avancée du module Logigramme

## Problèmes actuels

1. **Cadre limité** : hauteur fixée à `min(75vh, 800px)` — insuffisant pour les processus complexes (20 activités)
2. **Plein écran rudimentaire** : un simple Dialog sans toolbar, pas de panneaux latéraux
3. **Pas de mode horizontal** : tout est vertical, difficile à lire pour les processus longs
4. **Minimap non interactive** : affichage seulement, pas de navigation par clic/drag
5. **Pas de zoom intelligent** : fit-to-view ne s'exécute pas automatiquement au chargement
6. **Toolbar encombrée** : tous les boutons entassés en haut à droite, pas de séparation claire
7. **Pas de panneau de détails** : il faut ouvrir un Sheet pour voir les infos d'une activité
8. **Pas de recherche/filtre** : impossible de localiser une activité spécifique dans un grand diagramme

## Améliorations proposées

### 1. Layout flexible avec panneaux redimensionnables
- Remplacer le conteneur fixe par `ResizablePanelGroup` (déjà disponible dans le projet)
- **Panneau gauche** (70-80%) : le canvas SVG du logigramme
- **Panneau droit** (20-30%) : panneau de détails contextuel de l'activité sélectionnée (description, entrées/sorties, responsable, flux) — consultable sans ouvrir de Sheet
- Le panneau droit est rétractable/masquable

### 2. Plein écran amélioré
- Passer de `Dialog` à un vrai plein écran natif (`document.documentElement.requestFullscreen()`) ou un overlay `fixed inset-0 z-50`
- Conserver toute la toolbar + minimap + panneau latéral en plein écran
- Hauteur du canvas en mode normal : passer de `min(75vh, 800px)` à `calc(100vh - 220px)` pour exploiter tout l'espace disponible

### 3. Minimap interactive
- Ajouter `onMouseDown`/`onMouseMove` sur la minimap pour naviguer par drag du rectangle viewport
- Cliquer dans la minimap recentre la vue sur la zone cliquée

### 4. Auto-fit au chargement
- Appeler `fitToView()` automatiquement après le premier rendu du layout pour afficher tout le diagramme sans scroll initial

### 5. Recherche et focus rapide
- Ajouter un champ de recherche dans la toolbar (icône Search)
- Filtre par description d'activité — les résultats highlight les nœuds correspondants
- Cliquer sur un résultat recentre + zoome sur l'activité ciblée

### 6. Panneau de détails inline (sans Sheet)
- Quand une activité est sélectionnée, le panneau droit affiche :
  - Code + description
  - Type de flux (badge coloré)
  - Condition (si applicable)
  - Responsable
  - Entrées / Sorties résolues
  - Boutons : Modifier (ouvre le Sheet), Dupliquer, Supprimer
- En mode consultation (pas canEdit), affichage lecture seule

### 7. Toolbar réorganisée
- Regrouper en sections distinctes avec séparateurs visuels :
  - **Navigation** : Zoom +/−, Fit, Reset, Plein écran
  - **Édition** : Undo/Redo, Snap, Align H/V, Auto-layout
  - **Actions** : Dupliquer, Supprimer, + Activité
  - **Recherche** : champ avec icône

## Détails techniques

### Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/ProcessTasksFlowchart.tsx` | Refactoring majeur : panneau resizable, minimap interactive, auto-fit, recherche, toolbar réorganisée, plein écran amélioré, panneau détails inline |

### Approche
- Utiliser `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle` existants (`src/components/ui/resizable.tsx`)
- Extraire le panneau de détails en sous-composant inline (pas un nouveau fichier, pour limiter la complexité)
- Le `fitToView` est appelé dans un `useEffect` avec dépendance sur `layout` + un flag `initialFitDone`
- La minimap reçoit des handlers `onMouseDown`/`onMouseMove` qui calculent le pan correspondant via la transformation inverse (coordonnées minimap → coordonnées diagram)
- La recherche utilise un state `searchQuery` qui filtre les nœuds visuellement (opacité réduite pour les non-matchés, highlight pour les matchés)

