

# Refonte UI/UX du Logigramme — Interface Puissante et Professionnelle

## Problemes actuels identifies (code analyse)

1. **Chevauchement Debut/Entrees** : `curY` utilise un offset fixe `PROCESS_IO_BOX_H + 40` (ligne 91) sans tenir compte du nombre reel d'entrees. Avec 4+ entrees, le cercle Debut masque le texte.

2. **Labels de condition coupes** : Largeur fixe 72px, troncature a 12 chars (ligne 281-288). "SI document conforme" devient "SI document…" — illisible.

3. **Bulle de decision mal placee** : Positionnee sous le losange (ligne 314, `y = cy + half + 4`) — entre en conflit avec les edges sortants.

4. **Polices trop petites** : 8px-9px pour les I/O, 10px pour les codes, 11px pour les descriptions. Difficile a lire meme a zoom 100%.

5. **Cards trop rigides** : `CARD_H = 140` fixe, contenu coupe si description longue ou beaucoup d'I/O.

6. **"Sinon" invisible** : Aucune indication dans l'editeur qu'il faut laisser le champ vide pour creer le chemin par defaut.

7. **Toolbar basique** : Pas de minimap, pas d'export, pas de recherche.

## Plan de correction complet

### A. Layout dynamique (`computeLayout`)

- **Hauteur des cards dynamique** : Calculer `CARD_H` par noeud en fonction du nombre d'entrees/sorties et de la longueur de description (min 140, max 260).
- **Espacement entrees/debut** : `curY += realInputBoxHeight + 60` au lieu de `PROCESS_IO_BOX_H + 40`.
- **Largeur process I/O** : Augmenter `PROCESS_IO_BOX_W` de 280 a 360 pour accueillir les descriptions longues.

### B. Labels de condition ameliores (`FlowchartEdge`)

- **Largeur dynamique** : `badgeW = Math.max(80, label.length * 7 + 24)`.
- **Troncature a 24 chars** au lieu de 12.
- **Hauteur badge** : 24px au lieu de 20px.
- **Police** : 10px au lieu de 9px.
- **Position** : Badge centre sur le segment horizontal de l'edge orthogonal.

### C. Bulle de decision repositionnee (`GatewayShape`)

- Deplacer la bulle a **gauche** du losange : `x = cx - half - bubbleW - 8`.
- Centrer verticalement par rapport au gateway.
- Augmenter la largeur max a 220px et la troncature a 35 chars.

### D. Polices et lisibilite des cards

- Entrees/Sorties : de 9px a **10px**.
- Labels "Entrees"/"Sorties" : de 8px a **9px**.
- Code : de 10px a **11px**.
- Description : de 11px a **12px**.
- Acteur banner : de 10px a **11px**.
- Colonnes I/O : de 100px a **110px**, card width de 420 a **440px**.

### E. Hint "Sinon" plus visible (`FlowchartNodeEditor`)

- Remplacer le simple texte italique 10px par un encadre colore :
  ```
  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-2">
    <Info className="h-4 w-4 text-amber-600" />
    <span className="text-xs text-amber-800">
      Laissez vide pour creer le chemin par defaut (SINON)
    </span>
  </div>
  ```

### F. Toolbar enrichie

- Ajouter bouton **"Fit to view"** (calcul auto du zoom/pan pour tout afficher).
- Ajouter indicateur du **nombre d'activites** dans la toolbar.
- Separateur visuel entre groupes de boutons.

### G. Minimap (coin inferieur droit)

- Petit rectangle 160x100px montrant une vue miniature du diagramme entier.
- Rectangle rouge indiquant le viewport actuel.
- Cliquable pour naviguer rapidement.

## Fichiers modifies

| Fichier | Changements |
|---------|------------|
| `ProcessTasksFlowchart.tsx` | Layout dynamique, edge labels, bulle decision, polices, toolbar, minimap, fit-to-view |
| `FlowchartNodeEditor.tsx` | Hint Sinon visible |

## Risques verifies

| Risque | Mitigation |
|--------|-----------|
| Card hauteur dynamique casse le layout des branches | Min/max clamp (140-260px), recalcul correct dans `layoutSequence` |
| Badge edge depasse le viewBox | `minX/maxX` deja calcule a +80px de marge |
| Minimap performance | Rendu simplifie (rectangles + lignes, pas de foreignObject) |
| Bulle gauche hors viewBox si gateway a gauche | `minX` calcul prend en compte `cx - bubbleW` |

