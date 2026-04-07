

# Peupler le processus "Gérer SI" — Données complètes + 20 activités

## Vue d'ensemble

Remplir le processus `44f32eb8-b0a2-4e7e-8439-e9cd2ca27d03` avec toutes les données métier et 20 activités couvrant les 4 types de flux (séquentiel, conditionnel XOR, parallèle AND, inclusif OR) avec imbrications.

## Données à insérer

### 1. Mettre à jour le processus (tous les champs)
- **description** : "Processus de gestion du Système d'Information couvrant l'infrastructure, les applications, la sécurité et le support utilisateur"
- **responsable_id** : `bfe26ba2-...` (responsable SI)
- **inclure_bpmn_pdf** : true

### 2. Éléments du processus (24 éléments)

| Type | Code | Description |
|---|---|---|
| finalite | F-001 | Assurer la disponibilité et la performance du SI |
| finalite | F-002 | Garantir la sécurité des données |
| donnee_entree | DE-001 | Demande d'intervention utilisateur |
| donnee_entree | DE-002 | Rapport d'incident sécurité |
| donnee_entree | DE-003 | Cahier des charges nouveau projet |
| donnee_entree | DE-004 | Contrat fournisseur IT |
| donnee_entree | DE-005 | Résultats audit précédent |
| donnee_sortie | DS-001 | Ticket résolu et clôturé |
| donnee_sortie | DS-002 | Rapport de sécurité mensuel |
| donnee_sortie | DS-003 | Système déployé et validé |
| donnee_sortie | DS-004 | Plan de reprise à jour |
| donnee_sortie | DS-005 | Bilan de performance SI |
| activite | AP-001 | Gestion des demandes |
| activite | AP-002 | Maintenance infrastructure |
| partie_prenante | PP-001 | Direction Générale |
| partie_prenante | PP-002 | Utilisateurs métier |
| partie_prenante | PP-003 | Fournisseurs IT |
| partie_prenante | PP-004 | RSSI |
| ressource | R-001 | Serveurs et réseau |
| ressource | R-002 | ITSM (outil ticketing) |
| ressource | R-003 | SIEM (supervision sécurité) |
| ressource | R-004 | Budget IT annuel |

### 3. Activités (20 tâches) — Architecture logique

```text
1. Réceptionner la demande (séquentiel) → DE-001
2. Qualifier et prioriser (conditionnel XOR) → DS-001
   ├─ 3. Traiter incident critique (SI condition="Critique")
   │     → (conditionnel XOR)
   │     ├─ 5. Escalader niveau 2 (SI condition="Non résolu N1")
   │     └─ 6. Résoudre en niveau 1 (SINON — défaut)
   └─ 4. Traiter demande standard (SINON — défaut)
7. Analyser impact sécurité (parallèle AND)
   ├─ 8. Scanner vulnérabilités (branche AND)
   ├─ 9. Vérifier conformité RGPD (branche AND)
   └─ 10. Auditer les accès (branche AND)
11. Décider plan d'action sécurité (inclusif OR)
    ├─ 12. Patch correctif urgent (SI condition="Faille critique")
    ├─ 13. Mise à jour planifiée (SI condition="Faille mineure")
    └─ 14. Formation utilisateurs (SI condition="Erreur humaine")
15. Déployer les changements (séquentiel) → DE-003, DS-003
16. Valider en recette (conditionnel XOR)
    ├─ 17. Rollback et corriger (SI condition="Tests KO")
    └─ 18. Mettre en production (SINON — défaut)
19. Documenter et clôturer (séquentiel) → DS-001, DS-005
20. Revue de performance SI (séquentiel) → DE-005, DS-002
```

Ce schéma couvre :
- **Séquentiel** : tâches 1, 15, 19, 20
- **Conditionnel XOR** : tâche 2 (2 branches) + tâche 3 imbriquée (2 sous-branches) + tâche 16 (2 branches)
- **Parallèle AND** : tâche 7 (3 branches simultanées)
- **Inclusif OR** : tâche 11 (3 branches optionnelles)
- **Imbrication** : XOR dans XOR (tâche 3 → 5/6 à l'intérieur de 2 → 3/4)

### 4. Supprimer la tâche existante
Supprimer l'ancienne tâche "suiver le CA" avant d'insérer les nouvelles.

## Exécution

1. DELETE ancienne tâche
2. UPDATE process (description, responsable_id, inclure_bpmn_pdf)
3. INSERT 24 process_elements
4. INSERT 20 process_tasks avec codes, parent_code, conditions, entrées/sorties

## Fichiers impactés

Aucune modification de code — uniquement des insertions/updates SQL via les outils d'insertion.

