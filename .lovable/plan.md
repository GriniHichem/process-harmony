

# Navigation améliorée du logigramme avec focus & effets visuels

## Problèmes identifiés

1. **Navigation Précédente/Suivante** : le zoom cible est 0.8 (trop petit) et il n'y a aucun effet visuel marqué pour identifier l'activité en cours
2. **Pas d'effet lumineux** sur l'activité focalisée ni sur sa condition/remarque
3. Le bouton "Suivante" est désactivé quand on est au dernier élément au lieu de boucler ou rester visible

## Modifications prévues

### 1) Zoom à 110% lors de la navigation
Dans `focusOnTask`, changer `targetZoom = 0.8` → `targetZoom = 1.1` pour que l'activité ciblée soit bien visible et lisible au centre de l'écran.

### 2) Effet de lumière (glow) sur l'activité focalisée
Ajouter un filtre SVG `<feGaussianBlur>` + `<feMerge>` pour créer un halo lumineux autour du rectangle de l'activité sélectionnée via navigation. L'effet sera un rectangle animé avec `opacity` pulsante (keyframe SVG `animate`) en couleur primaire.

Remplacement du simple `rect` de sélection actuel par :
- Un halo lumineux bleu/primaire avec blur (glow effect)
- Une animation de pulsation douce (opacity 0.3 → 0.7 → 0.3)

### 3) Effet de lumière sur la condition
Quand l'activité focalisée a une `condition` non nulle, ajouter un badge condition avec un effet de surbrillance (fond jaune/ambre lumineux avec animation subtile) pour attirer l'attention.

### 4) Transition fluide
Ajouter une transition CSS `transition: all 0.3s ease` sur le pan/zoom pour que le déplacement vers l'activité suivante soit animé et non instantané.

### 5) Navigation circulaire
Quand on atteint la dernière activité et qu'on clique "Suivante" → revenir à la première. Idem "Précédente" depuis la première → aller à la dernière.

## Fichier impacté

| Fichier | Changement |
|---|---|
| `src/components/ProcessTasksFlowchart.tsx` | `focusOnTask` zoom 1.1, glow filter SVG, animation pulsation, condition highlight, navigation circulaire |

## Détails techniques

- **Glow filter** : ajout d'un `<filter id="glow-focus">` dans les `<defs>` du SVG avec `feGaussianBlur stdDeviation="6"` + merge
- **Pulsation** : `<animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />`
- **Condition highlight** : badge ambre avec `animate` sur `opacity` similaire
- **Zoom** : `targetZoom = 1.1` dans `focusOnTask`
- **Navigation** : modulo logic dans `handlePrevTask`/`handleNextTask`

