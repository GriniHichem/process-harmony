

# Logigramme interactif — Drag & Drop, positions persistées, outils avancés

## Analyse de l'existant

Le logigramme actuel (`ProcessTasksFlowchart.tsx`, 1038 lignes) utilise un moteur de layout automatique (`computeLayout`) qui calcule les positions de chaque noeud de facon déterministe. Il n'y a pas de positions stockées en base — les coordonnées sont recalculées a chaque rendu. Le composant gere deja zoom, pan, minimap et fullscreen.

La table `process_tasks` ne contient pas de colonnes `x`/`y` pour stocker les positions manuelles.

## Plan d'implementation

### Phase 1 — Migration : ajouter colonnes position

Ajouter `position_x` (float, nullable) et `position_y` (float, nullable) a `process_tasks`. Quand ces colonnes sont NULL, le layout automatique s'applique. Quand elles ont des valeurs, la position manuelle est utilisee.

```sql
ALTER TABLE process_tasks
ADD COLUMN IF NOT EXISTS position_x double precision,
ADD COLUMN IF NOT EXISTS position_y double precision;
```

### Phase 2 — Drag & Drop des noeuds

Dans le composant principal :
- Ajouter un etat `draggedNodeId` + `dragOffset`
- Sur `mousedown` d'un noeud en mode edit : demarrer le drag
- Sur `mousemove` : mettre a jour la position locale du noeud (dans un state `overrides` de type `Map<string, {x,y}>`)
- Sur `mouseup` : sauvegarder `position_x`/`position_y` en base via update Supabase
- Les connecteurs se recalculent automatiquement car ils sont derives des positions des noeuds

Le layout engine sera modifie : apres calcul auto, si `task.position_x != null`, on ecrase les coordonnees par celles de la base.

### Phase 3 — Toolbar enrichie

Ajouter une barre d'outils au-dessus du canvas avec :
- **Auto-layout** : bouton qui reset toutes les positions (`position_x = null, position_y = null`) et relance le calcul automatique
- **Grille snap** : toggle qui arrondit les positions au nearest 20px lors du drop
- **Alignement** : boutons pour aligner les noeuds selectionnes (horizontal/vertical center)
- **Undo/Redo** : pile d'historique locale (positions + CRUD) avec max 20 etapes
- **Dupliquer** : copier une activite (meme description, entrees/sorties, position decalee de +40px)
- **Supprimer** : bouton dans la toolbar (en plus du dialog existant), avec confirmation

### Phase 4 — Edition rapide par double-clic

- Simple clic : selectionner le noeud (highlight)
- Double-clic : ouvrir le `FlowchartNodeEditor` (comportement actuel du clic)
- Le noeud selectionne affiche un contour + poignees de drag visuelles

### Phase 5 — Ameliorations connecteurs

Les edges sont deja recalcules dans `computeLayout`. On ajuste :
- Quand un noeud est deplace, recalculer les edges en temps reel (pas seulement au drop)
- Ajouter des fleches courbes (bezier) au lieu de lignes droites pour les branches laterales

### Phase 6 — UX polish

- Curseur `grab`/`grabbing` sur les noeuds en mode drag
- Indicateur visuel de snap (lignes guides bleues quand aligne avec un autre noeud)
- Animation de transition lors du retour en auto-layout
- Raccourcis clavier : `Ctrl+Z` undo, `Ctrl+Y` redo, `Delete` supprimer, `Ctrl+D` dupliquer

## Architecture technique

```text
ProcessTasksFlowchart.tsx
├── State: positionOverrides Map<taskId, {x,y}>
├── computeLayout() → positions auto
├── applyOverrides() → merge positions manuelles
├── Drag handlers (mousedown/move/up sur foreignObject)
├── Toolbar (auto-layout, snap, align, undo/redo, duplicate, delete)
├── Undo stack: Array<{type, data}>
└── Save positions: supabase.update({position_x, position_y})
```

## Fichiers modifies

| Fichier | Action |
|---|---|
| `supabase/migrations/xxx.sql` | Ajouter `position_x`, `position_y` a `process_tasks` |
| `src/components/ProcessTasksFlowchart.tsx` | Drag&drop, toolbar enrichie, undo/redo, snap, alignement, double-clic edit |
| `src/components/FlowchartNodeEditor.tsx` | Aucune modification structurelle, juste ajout prop `onDuplicate` |

## Contraintes

- Migration idempotente (`IF NOT EXISTS`)
- Pas de breaking change : positions NULL = auto-layout (retrocompatible)
- Le drag ne s'active qu'en mode `canEdit`
- Les connecteurs se mettent a jour en temps reel pendant le drag
- La sauvegarde des positions est debounced (300ms) pour eviter trop de requetes

