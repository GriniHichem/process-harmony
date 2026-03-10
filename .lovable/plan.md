

# Tableau des tâches processus (BPMN tabulaire)

## Concept

Remplacer la logique BPMN visuelle par un **tableau structuré de tâches** pour chaque processus. Chaque tâche porte une codification intelligente qui encode la logique de flux (séquentiel, conditionnel, parallèle).

## Système de codification

```text
Code        Signification                    Type de flux
──────────────────────────────────────────────────────────
1           Tâche 1 (séquentielle)           Séquentiel
2           Tâche 2 (point de décision)      Conditionnel (XOR)
2.a1        → branche SI (condition vraie)   
2.a2        → branche SINON                  
3           Tâche 3 (séquentielle)           Séquentiel
4           Tâche 4 (parallèle)             Parallèle (AND)
4.p1        → sous-tâche parallèle 1         
4.p2        → sous-tâche parallèle 2         
5           Tâche 5 (inclusif)              Inclusif (OR)
5.o1        → option 1 (au moins une)        
5.o2        → option 2                       

Préfixes branches :
  .a = alternative (SI/SINON - XOR)
  .p = parallèle (toutes obligatoires - AND)
  .o = optionnel inclusif (au moins une - OR)
```

## Modele de donnees

**Nouvelle table `process_tasks`** :

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| process_id | uuid FK | Processus parent |
| code | text | Codification (ex: "2.a1") |
| description | text | Description de la tache |
| type_flux | enum | `sequentiel`, `conditionnel`, `parallele`, `inclusif` |
| condition | text | Condition (pour branches SI/SINON) |
| parent_code | text | Code parent (ex: "2" pour "2.a1"), null si racine |
| responsable_id | uuid | Acteur responsable (ref acteurs) |
| ordre | integer | Ordre d'affichage |
| entrees | text | Donnees d'entree |
| sorties | text | Donnees de sortie |
| documents | text[] | Refs documents associes |
| created_at, updated_at | timestamptz | |

**Enum `task_flow_type`** : `sequentiel`, `conditionnel`, `parallele`, `inclusif`

## Interface utilisateur

Un nouvel onglet **"Taches"** dans la page ProcessDetail, affichant un tableau :

```text
┌──────┬───────────────────┬──────┬──────────┬──────────┬──────────┬──────────────┐
│ Code │ Description       │ Type │ Entrées  │ Sorties  │ Resp.    │ Documents    │
├──────┼───────────────────┼──────┼──────────┼──────────┼──────────┼──────────────┤
│ 1    │ Réception demande │ →    │ Demande  │ Fiche    │ Agent    │ F-001        │
│ 2    │ Analyse demande   │ ◇    │ Fiche    │          │ Resp.    │              │
│ 2.a1 │  ↳ SI conforme    │  →   │          │ Accord   │ Resp.    │ F-002        │
│ 2.a2 │  ↳ SINON rejet    │  →   │          │ Rejet    │ Resp.    │              │
│ 3    │ Exécution         │ ═    │ Accord   │ Livrable │ Equipe   │              │
│ 3.p1 │  ↳ Préparation    │  →   │          │          │ Tech.    │              │
│ 3.p2 │  ↳ Contrôle       │  →   │          │ PV       │ Qualité  │              │
└──────┴───────────────────┴──────┴──────────┴──────────┴──────────┴──────────────┘

Légende :  → Séquentiel  ◇ Conditionnel (XOR)  ═ Parallèle (AND)  ≈ Inclusif (OR)
```

- Les sous-taches (branches) sont indentees visuellement
- Icones distinctes par type de flux
- Formulaire d'ajout avec choix du type et generation automatique du code
- Ajout de branches via bouton "Ajouter branche" sur les taches conditionnelles/paralleles
- Selection du responsable depuis la liste des acteurs
- Champs entrees/sorties en texte libre
- Association de documents existants via multi-select

## Implementation

1. **Migration DB** : creer l'enum `task_flow_type` et la table `process_tasks` avec RLS (memes regles que `process_elements`)
2. **Composant `ProcessTasksTable`** : tableau interactif avec CRUD, codification auto, indentation des branches
3. **Integration dans `ProcessDetail.tsx`** : nouvel onglet Tabs entre infos generales et elements existants

## Securite RLS

- SELECT : tous les authentifies
- INSERT/UPDATE : rmq, responsable_processus, consultant, admin
- DELETE : rmq, admin

