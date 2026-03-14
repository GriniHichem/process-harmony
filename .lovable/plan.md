

# Distinction Entrées/Sorties Externes vs Internes — Conformité ISO 9001

## Analyse ISO 9001 (clause 4.4)

L'approche processus ISO 9001:2015 exige d'identifier clairement :
- **Les éléments d'entrée/sortie inter-processus** (externes) : données provenant d'un autre processus ou livrées à un autre processus, tracées via les interactions
- **Les éléments d'entrée/sortie internes** : données générées ou consommées à l'intérieur du processus, sans lien avec un autre processus

Actuellement, le logigramme affiche toutes les DE/DS dans les mêmes boîtes "Entrées du processus" / "Sorties du processus" sans distinction. Il faut croiser les `process_elements` avec les `process_interactions` pour classifier chaque élément.

## Solution

### Logique de classification

Dans `ProcessTasksFlowchart`, charger les `process_interactions` du processus et créer deux sous-listes pour chaque type :

```text
Entrées:
  - Externes = DE dont l'id apparaît dans process_interactions (direction "entree")
  - Internes = DE restantes

Sorties:
  - Externes = DS dont l'id apparaît dans process_interactions (direction "sortie")  
  - Internes = DS restantes
```

### Affichage visuel (boîtes processus haut/bas)

Remplacer les boîtes simples par des boîtes divisées en 2 sections :

```text
┌─────────────────────────────────────┐
│       ENTRÉES DU PROCESSUS          │
│ ┌─────────────────────────────────┐ │
│ │ 🔗 Externes (inter-processus)  │ │
│ │  DE-001: Commande client ← PRO-002│
│ │  DE-003: Cahier des charges ← PRO-005│
│ ├─────────────────────────────────┤ │
│ │ 📋 Internes                     │ │
│ │  DE-002: Planning interne       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- **Externes** : badge avec icône `Link2` + nom du processus source/cible
- **Internes** : badge simple avec icône `FileText`
- Couleurs distinctes : externes en bleu/vert vif, internes en gris-bleu/gris-vert subtil

### Fichier modifié

| Fichier | Changement |
|---------|-----------|
| `src/components/ProcessTasksFlowchart.tsx` | Fetch `process_interactions` + `processes` (noms), classifier DE/DS en externe/interne, refonte des boîtes processus haut/bas avec 2 sections, ajuster la hauteur dynamique |

### Détails techniques

1. **Nouveau fetch** dans le composant : `process_interactions` filtrées par `source_process_id = processId` + les noms des processus cibles
2. **Classification** : `Set<string>` des `element_id` présents dans les interactions → si présent = externe, sinon = interne
3. **Nom du processus lié** : pour chaque élément externe, afficher `← PRO-XXX` ou `→ PRO-XXX` selon la direction
4. **Hauteur dynamique** : recalcul de `realInputBoxH` et `processOutputsH` en tenant compte des deux sous-sections
5. **Largeur augmentée** : `PROCESS_IO_BOX_W` de 360 à 440 pour accueillir le nom du processus lié

