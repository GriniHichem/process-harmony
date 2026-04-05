

# Créer un projet de test complet + corriger les erreurs

## Erreurs identifiées et corrections

### Erreur 1 : `setTasksMap(map)` dupliqué (ligne 182)
Dans `ProjectActionsList.tsx`, ligne 182 : `setTasksMap(map)` est appelé **deux fois** de suite (lignes 181 et 182). Supprimer le doublon.

### Erreur 2 : `recalcActionFromTasks` ne gère pas le cas 0 tâches restantes
Après suppression de la dernière tâche, `freshTasks.length === 0` fait un `return` sans mettre l'avancement à 0. Il faut remettre l'action à 0% dans ce cas.

## Données de test à insérer

Un script SQL via l'outil d'insertion pour créer un projet complet :

### Projet
- **Titre** : "Certification ISO 9001 — Site Alger"
- **Statut** : en_cours, **Dates** : 2026-04-01 → 2026-09-30
- **Visibilité** : private, **Responsable** : Hichem Grini (`af8415dd-...`)
- 3 objectifs, 3 ressources, description complète

### Collaborateurs (3)
| Utilisateur | Accès |
|---|---|
| Sophie Martin (`cdfe8308-...`) | write |
| Karim Benali (`4eeb2843-...`) | read |
| Amine Bernard (`384f11e2-...`) | write |

### Actions (6) avec poids variés

| # | Titre | Multi-tâches | Poids | Statut | Dates |
|---|---|---|---|---|---|
| A1 | Audit diagnostic initial | Non | 15 | terminee (100%) | 04/01→04/15 |
| A2 | Rédaction politique qualité | Non | 10 | terminee (100%) | 04/10→04/30 |
| A3 | Mise en place processus | Oui | 30 | en_cours | 05/01→06/30 |
| A4 | Formation du personnel | Oui | 20 | planifiee | 06/01→07/31 |
| A5 | Audit interne pré-certification | Non | NULL | planifiee | 08/01→08/31 |
| A6 | Revue de direction finale | Non | NULL | planifiee | 09/01→09/15 |

### Tâches (6)
- **A3** : Cartographier processus (terminé 100%), Rédiger procédures (en_cours 50%), Valider avec pilotes (a_faire 0%)
- **A4** : Identifier besoins compétences (a_faire), Planifier formations (a_faire), Évaluer efficacité (a_faire)

### Dépendances (5)
- A2 **avant** A3
- A3 **avant** A4
- A5 **après** A4
- A5 **parallele** A6
- A1 **exclusive** A2

### Liens entités (4)
- A3 → risque `be289995-...`
- A3 → indicateur `3c8e3772-...`
- A5 → NC `45df076e-...`
- A5 → enjeu contexte `306ce59f-...`

### Logs d'échéances (2)
- A3 : 06/15 → 06/30 ("Retard cartographie")
- A4 : 07/15 → 07/31 ("Ajout module supplémentaire")

## Fichiers impactés

| Fichier | Action |
|---|---|
| Script SQL (insertion) | Insérer toutes les données de test |
| `src/components/projects/ProjectActionsList.tsx` | Supprimer `setTasksMap` dupliqué (L182) + fix `recalcActionFromTasks` pour 0 tâches |

