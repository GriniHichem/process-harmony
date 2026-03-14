

# Mode Graphique Interactif pour les Activités -- Plan ameliore

## Vision

Un logigramme interactif integre directement dans l'onglet Activites, pensee comme un **editeur visuel de workflow** -- pas simplement un viewer BPMN, mais un outil de creation natif ou chaque noeud EST le formulaire.

## Concept UX superieur

### 1. Toggle elegant dans le header de l'onglet
- Bouton segmente `ToggleGroup` avec icones `TableProperties` / `Workflow` -- transition animee avec fondu croise entre les deux vues.

### 2. Canvas Flowchart -- Design "Notion meets Figma"
- **Noeuds = cartes interactives riches** (pas de simples rectangles BPMN) :
  - Carte glass-card avec bordure coloree selon le type de flux (bleu=sequentiel, orange=XOR, vert=AND, violet=OR).
  - Affichage inline : code (badge mono), description (texte editable au double-clic), avatar+nom du responsable, pastilles compactes pour entrees/sorties avec tooltip.
  - Hover : elevation douce + highlight des connexions + apparition d'un mini-menu contextuel (edit, branch, delete).
- **Gateways** : losanges avec label du type et icone, les branches partent visuellement avec des lignes courbees.
- **Boutons "+" contextuels** :
  - Entre chaque noeud, un cercle "+" apparait au hover sur le lien pour inserer une activite.
  - Sur un noeud gateway, un bouton "Ajouter branche" apparait au hover.
  - A la fin du flux, un bouton "+" permanent pour ajouter une activite.
- **Auto-layout deterministe** : reutilise l'algorithme de `generateBpmnFromTasks` adapte pour des cartes plus grandes. Pas de drag-and-drop -- le layout est toujours propre et automatique.

### 3. Edition contextuelle -- Sheet lateral
- Click sur un noeud -> Sheet slide-in depuis la droite avec le formulaire complet (identique au Dialog actuel : description, type flux, condition, entrees/sorties avec ajout rapide, responsable).
- Le noeud selectionne est visuellement mis en evidence (bordure primary + ombre).
- Sauvegarde via bouton "Appliquer" dans le Sheet, puis le canvas se re-layout automatiquement.

### 4. Mode plein ecran
- Bouton `Maximize2` dans le coin du canvas -> Dialog fullscreen avec le flowchart qui occupe tout l'ecran.
- Toolbar flottante en haut : zoom +/-, bouton ajouter activite, bouton quitter plein ecran.

### 5. Zoom et pan
- Molette pour zoom, drag sur le fond pour pan (meme mecanique que le BpmnCanvas existant).
- Boutons zoom +/- dans une mini-toolbar flottante en bas a droite.

## Architecture fichiers

| Fichier | Action |
|---------|--------|
| `src/components/ProcessTasksFlowchart.tsx` | **Creer** -- Canvas SVG + auto-layout + noeuds cartes + interactions + zoom/pan + fullscreen |
| `src/components/FlowchartNodeEditor.tsx` | **Creer** -- Sheet lateral avec formulaire identique au Dialog existant |
| `src/pages/ProcessDetail.tsx` | **Modifier** -- Toggle ToggleGroup dans l'onglet Activites, rendu conditionnel |
| `src/components/ProcessTasksTable.tsx` | **Inchange** |

## Details techniques

**ProcessTasksFlowchart** :
- Memes props que `ProcessTasksTable` pour interchangeabilite parfaite.
- Charge les taches via Supabase (meme logique), calcule le layout via un algorithme adapte de `generateBpmnFromTasks` avec des dimensions de noeuds plus grandes (220x100 pour les cartes).
- Rendu SVG avec `foreignObject` pour les cartes HTML riches (glass-card, badges, avatars) a l'interieur du SVG.
- Liens : chemins orthogonaux SVG avec fleches, style pointille pour les associations.
- Cercles "+" inseres au milieu de chaque lien, visibles au hover.
- Gestion zoom/pan via state `zoom` + `pan` avec transform sur le groupe SVG principal.

**FlowchartNodeEditor** :
- Composant Sheet (radix) avec le meme formulaire que le Dialog existant dans ProcessTasksTable (description, type flux, condition, entrees/sorties avec quick-add, responsable).
- Recoit la task selectionnee, les processElements, acteurs en props.
- Callbacks onSave et onDelete qui remontent au parent.

**ProcessDetail.tsx** :
- Ajout d'un state `activityViewMode: "list" | "flowchart"` dans le TabsContent "tasks".
- ToggleGroup en haut du contenu avec les deux options.
- Rendu conditionnel de `ProcessTasksTable` ou `ProcessTasksFlowchart`.

## Interactions cle

- **Ajouter activite** : bouton "+" dans la toolbar ou entre les noeuds -> ouvre le Sheet avec formulaire vide.
- **Editer** : click sur un noeud -> ouvre le Sheet avec les donnees pre-remplies.
- **Ajouter branche** : hover sur un noeud gateway -> bouton branch -> ouvre le Sheet avec parent_code pre-rempli.
- **Supprimer** : icone poubelle dans le mini-menu hover ou dans le Sheet.
- **Double-clic sur description** : edition inline directe sur le canvas (sans ouvrir le Sheet).

