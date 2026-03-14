

# Logigramme Vertical 360° — Flux de données explicite

## Problème

Actuellement, les entrées/sorties sont affichées comme de simples compteurs (badges) sur chaque carte. La logique métier **"la sortie de l'activité N est l'entrée de l'activité N+1"** n'est pas du tout visible. Le logigramme doit être **auto-explicatif** : on doit voir le flux de données circuler entre les activités.

## Nouveau design vertical avec flux de données explicite

```text
            ┌─────────────────┐
            │  Données entrée  │  ← Process-level inputs (DE-1, DE-2...)
            │  processus       │
            └────────┬────────┘
                     │
                  ● Début
                     │
     ┌───────┐  ┌─────────────────┐  ┌───────┐
     │ DE-1  │──│  [1] Activité 1  │──│ DS-1  │
     │ DE-2  │──│  Vérifier docs   │──│ DS-2  │
     └───────┘  │  👤 Resp. Qual.  │  └───┬───┘
                └────────┬────────┘      │
                         │               │
                    ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ┘
                    │    │  DS-1 → DE de Act.2
                    ▼    ▼
     ┌───────┐  ┌─────────────────┐  ┌───────┐
     │ DS-1  │──│  [2] Activité 2  │──│ DS-3  │
     │       │  │  Analyser        │──│ DS-4  │
     └───────┘  │  👤 Dir. Prod.   │  └───────┘
                └────────┬────────┘
                         │
                      ● Fin
                         │
            ┌─────────────────┐
            │  Données sortie  │  ← Process-level outputs
            │  processus       │
            └─────────────────┘
```

## Principe clé : traçabilité du flux de données

Les sorties (DS) de l'activité précédente qui sont aussi des entrées (DE) de l'activité suivante seront représentées par des **lignes de liaison de données** (trait pointillé coloré) qui descendent d'un noeud à l'autre. Cela rend le flux **explicite et traçable**.

## Architecture du noeud enrichi (3 colonnes)

Chaque carte (~400px large, ~130px haut) :
- **Colonne gauche** : pastilles bleues avec les noms complets des entrées
- **Colonne centre** : code badge + description + bandeau acteur coloré
- **Colonne droite** : pastilles vertes avec les noms complets des sorties
- **Bandeau acteur** : couleur unique par responsable pour identification visuelle instantanée

## Changements dans `ProcessTasksFlowchart.tsx`

### 1. Layout engine → direction verticale
- Axe principal = Y (top→bottom), espacement `V_GAP = 120`
- Branches gateway s'étalent horizontalement
- Noeuds élargis : `CARD_W = 400, CARD_H = 130`
- Start/End circles en haut/bas

### 2. Rendu des noeuds — 3 colonnes visibles
- `foreignObject` large avec structure flex :
  - Left col : liste des entrées (pills bleues, texte complet)
  - Center col : code + description + acteur
  - Right col : liste des sorties (pills vertes, texte complet)

### 3. Flux de données inter-activités
- Après le layout, analyser les paires d'activités consécutives
- Si une sortie (code DS-x) d'Act.N apparaît comme entrée d'Act.N+1 → dessiner un trait pointillé orange reliant les deux pastilles
- Les données qui ne sont PAS partagées entre activités restent affichées normalement sans liaison

### 4. Process-level I/O
- En haut du diagramme : colonne des entrées globales du processus (éléments `donnee_entree`)
- En bas : colonne des sorties globales (éléments `donnee_sortie`)

### 5. Palette acteurs
- Chaque responsable unique reçoit une couleur de la palette (8 couleurs prédéfinies)
- Le bandeau en bas de la carte utilise cette couleur
- Légende en bas du canvas

### 6. Gateways verticaux
- Le losange est centré sur l'axe vertical
- Les branches partent horizontalement (gauche/droite) puis descendent vers les cartes

## Fichier modifié

| Fichier | Action |
|---------|--------|
| `src/components/ProcessTasksFlowchart.tsx` | **Refonte complète** — layout vertical, noeuds 3 colonnes, flux de données explicites, palette acteurs |

Aucun autre fichier modifié.

