

# Dashboard Indicateurs 360° — Vue enrichie pour RMQ et Direction

## Objectif

Transformer le dashboard actuel (4 KPI + tableau) en une vue 360° avec graphiques de synthese, repartition par type/processus, tendances, et indicateurs critiques mis en evidence.

## Ajouts prevus dans `src/pages/DashboardIndicateurs.tsx`

### 1. Nouvelles KPI cards (ligne 2)
- **Intermédiaire** : compteur des indicateurs entre seuil et cible (le "warning" actuel, non affiché)
- **Taux de conformité** : pourcentage d'indicateurs à l'objectif sur ceux mesurés (`okCount / (totalIndicators - noMeasureCount) * 100`)

Passer de 4 a 6 cartes KPI sur 2 lignes de 3.

### 2. Section graphiques (entre KPI et tableau)

**Graphique 1 — Donut : Répartition par statut**
- PieChart Recharts avec 4 segments : À l'objectif (vert), Intermédiaire (jaune), En alerte (rouge), Sans mesure (gris)
- Texte central avec le taux de conformité

**Graphique 2 — BarChart : Indicateurs par processus**
- Barres empilées (stacked) par processus, colorées par statut (ok/warning/alert/no_measure)
- Permet a la direction de voir d'un coup d'oeil quels processus sont en difficulté

**Graphique 3 — BarChart : Répartition par type d'indicateur**
- Barres groupées par type (Activité, Résultat, Perception, Interne) avec couleurs par statut

### 3. Section "Indicateurs critiques" (avant le tableau)
- Card dédiée listant uniquement les indicateurs en alerte avec :
  - Nom, processus, dernière valeur vs cible, ecart en %, tendance (hausse/baisse par rapport a l'avant-derniere mesure)
- Visible uniquement s'il y a des alertes

### 4. Colonne "Tendance" dans le tableau existant
- Ajouter une colonne avec une fleche (↑ hausse, ↓ baisse, → stable) comparant les 2 dernières mesures
- Colonne "Nb mesures" pour voir le volume de données

### 5. Filtre par type d'indicateur
- Ajouter un second Select pour filtrer par type (Activité/Résultat/Perception/Interne) en plus du filtre processus

## Fichier modifié

| Fichier | Action |
|---|---|
| `src/pages/DashboardIndicateurs.tsx` | Enrichir avec graphiques Recharts, KPI supplémentaires, section alertes, tendances |

Aucune modification de base de données requise — toutes les données nécessaires sont déjà chargées (indicators, indicator_values, processes).

