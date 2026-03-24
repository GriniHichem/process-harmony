

# Dashboard Indicateurs — Filtre date + Améliorations UX/UI/Graphiques

## 1. Filtre par période (date de/à)

Ajouter deux date pickers (Date début / Date fin) dans la barre de filtres. Quand une période est définie :
- Les KPI, graphiques et tableau se recalculent en ne considérant que les mesures (`indicator_values`) dans cette plage
- Le statut d'un indicateur se base sur la **dernière valeur dans la période** (pas la dernière globale)
- L'export CSV ne contient que les mesures de la période sélectionnée
- Bouton "Réinitialiser" pour effacer les dates

Cela permet de comparer une situation passée avec l'actuelle en changeant simplement les dates.

## 2. Corrections des graphiques (axes X/Y logiques)

**BarChart "Performance par processus"** (stacked, layout vertical) :
- XAxis : `allowDecimals={false}`, `domain={[0, 'auto']}`, `tickCount` adapté
- YAxis : tronquer les noms longs (`tickFormatter` max 20 chars)

**BarChart "Répartition par type"** :
- YAxis : `allowDecimals={false}`, `domain={[0, 'auto']}`
- Ajouter `<Legend />` pour identifier les couleurs

**Donut** :
- Ajouter texte central avec le taux de conformité (`complianceRate%`)
- Labels avec pourcentages au lieu de valeurs brutes

## 3. Améliorations UX/UI

- **KPI Cards** : ajouter un sous-texte de contexte (ex: "sur X mesurés") et icônes plus distinctes ; utiliser les classes `glass-card` ou `card-elevated` du design system existant
- **Section filtres** : regrouper dans une Card dédiée avec label "Filtres" ; layout responsive en grille
- **Tableau** : ajouter zebra striping, sticky header, et coloration conditionnelle de la cellule "Dernière valeur" (vert si ok, rouge si alerte)
- **Indicateurs critiques** : ajouter une icône pulsante et afficher la date de dernière mesure
- **Graphiques** : hauteur augmentée à 280px, marges ajustées, couleurs cohérentes avec le thème

## Fichier modifié

| Fichier | Modification |
|---|---|
| `src/pages/DashboardIndicateurs.tsx` | Ajout filtres date (Popover+Calendar), recalcul KPI/graphiques filtrés par période, corrections axes, améliorations UI |

Aucune modification de base de données nécessaire.

