

# Filtres, masquage des actions terminées et épinglage prioritaire

## Vue d'ensemble

Ajouter une barre de filtres en haut de la liste des actions avec : filtre par statut, filtre par date d'échéance, filtre par date de création, bouton toggle pour masquer les actions terminées, et possibilité d'épingler des actions comme prioritaires (affichées en premier avec un indicateur visuel).

## Migration SQL

Ajouter une colonne `pinned` boolean sur `project_actions` :

```sql
ALTER TABLE project_actions
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
```

## Modifications — `ProjectActionsList.tsx`

### 1. Nouveaux états de filtrage
- `filterStatut` : filtre par statut (tous / planifiee / en_cours / terminee / en_retard)
- `hideTerminees` : boolean toggle pour masquer les actions terminées
- `filterEcheance` : "all" | "overdue" | "this_week" | "this_month"
- `sortBy` : "ordre" | "echeance" | "created_at"

### 2. Barre de filtres (UI)
Barre horizontale compacte au-dessus de la liste avec :
- `Select` pour le statut (avec icônes colorées)
- `Select` pour la période d'échéance (Toutes / En retard / Cette semaine / Ce mois)
- `Select` pour le tri (Ordre / Échéance / Date création)
- `Button` toggle avec icône `EyeOff` pour masquer/afficher les terminées
- Compteur d'actions filtrées visible

### 3. Épinglage prioritaire
- Bouton pin (icône `Pin`) sur chaque action (visible si `canEdit`)
- Les actions épinglées sont triées en premier, avec un indicateur visuel (bordure latérale colorée + badge "Prioritaire")
- Sauvegarde en DB via `updateAction(id, { pinned: true/false })`

### 4. Logique de filtrage
```typescript
const filteredActions = actions
  .filter(a => {
    if (hideTerminees && a.statut === "terminee") return false;
    if (filterStatut !== "all" && a.statut !== filterStatut) return false;
    if (filterEcheance === "overdue") return isOverdue(a);
    if (filterEcheance === "this_week") return isWithinDays(a.echeance, 7);
    if (filterEcheance === "this_month") return isWithinDays(a.echeance, 30);
    return true;
  })
  .sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // then by sortBy criterion
  });
```

### 5. Interface `ProjectAction`
Ajouter `pinned: boolean` au type.

## Fichiers modifiés

| Fichier | Action |
|---|---|
| Migration SQL | +1 colonne `pinned` sur `project_actions` |
| `ProjectActionsList.tsx` | Barre de filtres, logique filtrage/tri, épinglage, UI prioritaire |

