

# Navigation intelligente par type de flux

## Contexte

Actuellement, la navigation Précédente/Suivante parcourt les activités dans l'ordre plat (`ordre`), sans tenir compte de la structure logique du logigramme (branches conditionnelles, parallèles, inclusives). L'utilisateur veut une navigation qui respecte le flux BPMN réel.

## Comportement cible

### Séquentiel
- Passe directement à l'activité suivante dans la séquence racine
- Si l'activité 2 n'existe pas (supprimée), saute de 1 à 3

### Conditionnel (XOR)
- Quand on arrive sur une gateway conditionnelle, afficher un **popover de choix** listant les branches disponibles (avec leur condition comme label)
- L'utilisateur clique sur une branche pour y naviguer
- Les autres branches sont ignorées

### Parallèle (AND)
- Quand on arrive sur une gateway parallèle, naviguer automatiquement dans **toutes les branches séquentiellement** (branche 1 complète, puis branche 2, etc.)
- Un indicateur visuel montre quelle branche est en cours : `Branche 1/3`

### Inclusif (OR)
- Même logique que Parallèle : parcourir toutes les branches séquentiellement
- Indicateur de branche affiché

## Modifications techniques

### 1) Construire un chemin de navigation structuré

Remplacer `sortedTaskIds` (tri plat par `ordre`) par un **parcours en profondeur du graphe** qui suit la structure du logigramme :

```text
Exemple : AP-001 (seq) → AP-002 (cond) → [choix] → AP-002a (branche) → AP-003 (seq) → AP-004 (par) → AP-004p1 → AP-004p2 → AP-005
```

Nouveau type pour représenter les étapes de navigation :
```typescript
type NavStep =
  | { type: "task"; taskId: string }
  | { type: "gateway-choice"; parentCode: string; branches: { taskId: string; label: string }[] }
```

### 2) Popover de choix pour les conditionnels

Quand `handleNextTask` arrive sur un `gateway-choice` :
- Afficher un petit **Popover** ancré au bouton "Suivante" avec la liste des branches
- Chaque option affiche le label de la condition
- Cliquer sur une option focus sur cette branche et continue la navigation dedans
- Après la dernière activité de la branche, revenir au flux principal (après le merge)

### 3) Navigation séquentielle des branches parallèles/inclusives

Pour AND et OR :
- Entrer automatiquement dans la première branche
- Parcourir toutes ses activités
- Passer à la branche suivante
- Après la dernière branche, continuer après le merge
- Afficher un badge `Branche 1/N` dans la toolbar

### 4) Indicateur visuel dans la toolbar

Remplacer le simple compteur `1/N` par un affichage contextuel :
- Séquentiel : `AP-003 — 3/12`
- Conditionnel : `AP-002a — Branche: Si condition X`
- Parallèle/Inclusif : `AP-004p1 — Branche 1/3`

## Fichier impacté

| Fichier | Changement |
|---|---|
| `src/components/ProcessTasksFlowchart.tsx` | Nouvelle logique `buildNavPath()`, popover conditionnel, indicateur de branche, remplacement de `sortedTaskIds` |

## Détails d'implémentation

1. **`buildNavPath(tasks)`** : fonction qui parcourt les racines en ordre, et pour chaque gateway insère soit un `gateway-choice` (XOR) soit les branches aplaties séquentiellement (AND/OR)
2. **`currentNavStep`** : state qui pointe vers l'index dans le navPath
3. **`handleNextTask`** : si l'étape courante est un `gateway-choice`, ouvrir le popover au lieu d'avancer ; sinon avancer normalement
4. **Popover** : utiliser le composant `Popover` existant, ancré au bouton Suivante
5. **Badge branche** : affiché dans la toolbar quand on est dans une branche parallèle/inclusive

