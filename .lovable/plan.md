# Enrichissement de l'aide contextuelle ISO 9001:2015

## Constat

L'aide contextuelle couvre bien les articles 4.4 (processus), 6 (risques/objectifs), 9 (audit, indicateurs, revue) et 10 (NC, actions). Mais plusieurs articles majeurs manquent ou sont incomplets :

- **Art. 5 — Leadership** : manque engagement direction, orientation client
- **Art. 6.3 — Planification des modifications** : absent
- **Art. 7 — Support** : manque sensibilisation (7.3), communication (7.4), infrastructure (7.1.3), environnement de travail (7.1.4), connaissances organisationnelles (7.1.6)
- **Art. 8 — Réalisation** : manque planification opérationnelle (8.1), exigences produits/services (8.2), conception (8.3), production (8.5), libération (8.6)
- **Art. 9.1 — Surveillance et mesure** : définition existante mais incomplète (manque analyse/évaluation 9.1.3)
- **Art. 10 — Amélioration** : manque généralités (10.1)
- Certaines définitions existantes ont des `isoRef` incorrects ou manquants
- 2 pages sans HelpTooltip : Fournisseurs, Journal

## Modifications

### 1. Ajouter ~15 nouvelles définitions dans `helpDefinitions.ts`


| Clé                                | Titre                               | Article | Catégorie  |
| ---------------------------------- | ----------------------------------- | ------- | ---------- |
| `leadership`                       | Leadership et engagement            | §5.1    | pilotage   |
| `orientation_client`               | Orientation client                  | §5.1.2  | pilotage   |
| `roles_responsabilites`            | Rôles et responsabilités            | §5.3    | role       |
| `planification_modifications`      | Planification des modifications     | §6.3    | pilotage   |
| `infrastructure`                   | Infrastructure                      | §7.1.3  | concept    |
| `environnement_travail`            | Environnement de travail            | §7.1.4  | concept    |
| `connaissances_organisationnelles` | Connaissances organisationnelles    | §7.1.6  | concept    |
| `sensibilisation`                  | Sensibilisation                     | §7.3    | concept    |
| `communication`                    | Communication                       | §7.4    | concept    |
| `planification_operationnelle`     | Planification opérationnelle        | §8.1    | concept    |
| `exigences_produits_services`      | Exigences produits et services      | §8.2    | concept    |
| `conception_developpement`         | Conception et développement         | §8.3    | concept    |
| `production_prestation`            | Production et prestation de service | §8.5    | concept    |
| `liberation_produits`              | Libération des produits et services | §8.6    | concept    |
| `surveillance_mesure`              | Surveillance, mesure, analyse       | §9.1    | indicateur |
| `amelioration_generalites`         | Amélioration — Généralités          | §10.1   | audit      |


### 2. Corriger/enrichir définitions existantes

- `revue_processus` : corriger `isoRef` de `§9.3` → supprimer (la revue de processus n'est pas §9.3, c'est un outil de pilotage)
- `politique_qualite` : enrichir la définition avec les exigences §5.2 (appropriée, communiquée, comprise, disponible)
- `fournisseur` : enrichir avec §8.4 (évaluation, surveillance, réévaluation)
- `competences` : enrichir avec §7.2 (formation, tutorat, expérience, évaluation d'efficacité)
- `enjeux_contexte` : enrichir avec §4.1 (surveillance, revue périodique)

### 3. Ajouter HelpTooltip aux pages manquantes


| Page               | Terme                   |
| ------------------ | ----------------------- |
| `Fournisseurs.tsx` | `fournisseur`           |
| `Journal.tsx`      | `amelioration_continue` |


### 4. Enrichir les groupes sidebar avec des termes d'aide

Ajouter dans `groupHelpTerms` de `AppSidebar.tsx` :

- `"Principal"` → `"leadership"` (art. 5)

## Fichiers modifiés

- `src/lib/helpDefinitions.ts` — ajout ~15 définitions, correction de 6 existantes
- `src/pages/Fournisseurs.tsx` — ajout HelpTooltip
- `src/pages/Journal.tsx` — ajout HelpTooltip
- `src/components/AppSidebar.tsx` — ajout terme aide pour groupe "Principal"