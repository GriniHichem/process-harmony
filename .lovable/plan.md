
# Plan de correction définitive du logigramme

## Objectif
Remplacer la logique actuelle de “plein écran” embarqué par une vraie page/fenêtre dédiée au logigramme, plus stable, plus lisible, et plus simple à naviguer quand il y a beaucoup d’activités.

## Ce que je vais faire

### 1) Corriger d’abord l’erreur bloquante de build
- Rechercher et supprimer toute référence résiduelle à `PROCESS_IO_BOX_H`.
- Uniformiser toute la logique de hauteur des blocs Entrées/Sorties du processus avec `calcProcessIoBoxHeight(...)`.
- Revalider les calculs `viewBox`, `maxY` et les zones bas de diagramme pour éviter les erreurs TypeScript et les débordements visuels.

### 2) Changer la logique “plein écran”
Au lieu d’essayer d’agrandir le logigramme dans la carte actuelle :
- ajouter un bouton dans l’onglet Activités : `Ouvrir le logigramme`
- ce bouton ouvrira une nouvelle fenêtre / page dédiée au logigramme
- cette page utilisera toute la hauteur de l’écran sans dépendre de `requestFullscreen()`

Résultat :
- plus de bug de bascule rapide plein écran / non plein écran
- plus de limitation par la carte ou l’onglet parent
- expérience beaucoup plus propre et stable

### 3) Créer un workspace de lecture/navigation plus pro
Dans la nouvelle page du logigramme :
- barre d’outils fixe en haut avec :
  - Enregistrer
  - Activité précédente
  - Activité suivante
  - Rechercher / Aller à une activité
  - Ajuster à l’écran
  - Zoom +
  - Zoom -
  - Fermer / Retour
- sélection d’une activité = recentrage automatique sur l’activité
- bouton précédent/suivant = navigation selon l’ordre des activités
- recherche = focus direct sur l’activité ciblée
- panneau latéral de détail = lecture claire de :
  - description complète
  - responsable
  - entrées
  - sorties
  - condition / type de flux

### 4) Réduire les grands vides dans les rectangles activité
La lecture actuelle souffre parce que les colonnes Entrées/Sorties occupent trop d’espace dans la carte.

Je vais passer à une version plus compacte :
- dans le rectangle activité :
  - code
  - description
  - responsable
  - petits badges de synthèse du type `3 entrées`, `2 sorties`
- les listes détaillées d’entrées/sorties seront affichées surtout dans le panneau de détail
- si une activité n’a pas d’entrée ou pas de sortie :
  - la zone correspondante sera réduite fortement ou masquée
  - l’espace sera redonné à la description

Résultat :
- moins de vide
- plus de place pour lire l’activité
- meilleure lisibilité sur gros logigrammes

### 5) Corriger la lisibilité du responsable
Problème actuel :
- fond gris + texte blanc = contraste faible

Correction :
- utiliser une pastille responsable avec contraste garanti
- si la couleur est claire : texte foncé
- si la couleur est foncée : texte blanc
- pour le cas “non assigné” : fond clair neutre + texte foncé lisible

## UX finale visée
```text
┌──────────────────────────────────────────────────────────────┐
│ Enregistrer | Précédente | Suivante | Recherche | Zoom | X  │
├───────────────────────┬──────────────────────────┬───────────┤
│ Liste / recherche     │ Canvas logigramme        │ Détails   │
│ des activités         │ centré sur activité      │ activité  │
│                       │ sélectionnée             │ sélection │
└───────────────────────┴──────────────────────────┴───────────┘
```

## Détails techniques
- Ajouter une vraie route dédiée, par ex. `/processus/:id/logigramme`
- Ajouter un bouton d’ouverture depuis `ProcessDetail`
- Réutiliser `ProcessTasksFlowchart` avec un mode `standalone` ou créer un wrapper dédié
- Remplacer la logique actuelle de plein écran natif/fallback par une page plein écran structurelle
- Introduire une navigation pilotée par `selectedTaskId` + index courant
- Recentrage via `focusOnTask(taskId)` pour recherche, précédent, suivant
- Refactor des cartes activité pour réduire les colonnes IO internes et déplacer le détail vers le panneau latéral
- Corriger les couleurs du bandeau responsable avec une logique de contraste

## Fichiers impactés
- `src/components/ProcessTasksFlowchart.tsx`
- `src/pages/ProcessDetail.tsx`
- `src/App.tsx`
- nouveau fichier probable : `src/pages/ProcessFlowchartPage.tsx`
- éventuellement `src/components/FlowchartDetailPanel.tsx`

## Impact base de données
- aucun changement de base nécessaire

## Ordre d’implémentation
1. Fix build `PROCESS_IO_BOX_H`
2. Ajouter la route/page dédiée logigramme
3. Ajouter le bouton d’ouverture depuis Activités
4. Mettre la navigation précédente/suivante + focus activité
5. Refondre les cartes activité pour supprimer les grands vides
6. Corriger le style du responsable
7. Ajuster la lecture sur gros volumes d’activités
