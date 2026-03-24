

# Refonte de la Fiche Processus PDF — Format paysage style ISO

## Objectif

Refondre `exportProcessPdf.ts` pour produire un PDF paysage (A4 landscape) qui reprend la structure tabulaire de l'exemple fourni, avec les deux logos (entreprise + marque), sans historique ni résultats des indicateurs — uniquement les actions et moyens pour chaque element.

## Mapping exemple PDF → données existantes

| Section exemple | Source données |
|---|---|
| En-tête (logo + FICHE DE PROCESSUS + Code/Date/Version) | `process.code`, `version_courante`, logos dynamiques |
| Page de garde (Rédigé/Vérifié/Approuvé + Historique) | **Supprimée** (user dit "ne pas mettre historique") |
| Pilote du processus | `responsableName` |
| Finalité du processus | `elements` type `finalite` |
| Typologie (Management/Réalisation/Support) | `process.type_processus` avec case cochée |
| Données d'entrée | `elements` type `donnee_entree` |
| Données de sortie | `elements` type `donnee_sortie` |
| Activité / Responsable | `tasks` (code, description, responsable) |
| Processus en interaction | `interactions` + `targetProcesses` |
| Enjeux internes | `contextIssues` type `interne` + `contextIssueActions` |
| Enjeux externes | `contextIssues` type `externe` + `contextIssueActions` |
| Parties intéressées & attentes | `elements` type `partie_prenante` |
| Risques (+ moyens/actions) | `risks` type `risque` + `riskActions` + `riskMoyens` |
| Opportunités (+ actions) | `risks` type `opportunite` + `riskActions` + `riskMoyens` |
| Indicateurs de performance | `indicators` + `indicatorActions` + `indicatorMoyens` (pas de valeurs/historique) |
| Ressources | `elements` type `ressource` |
| Documents | `documents` |
| BPMN | `bpmnData` (si inclure_bpmn_pdf) |
| Approbation | Bloc signatures (existant) |

## Modifications dans `src/lib/exportProcessPdf.ts`

### 1. Passer en format paysage
- `@page { size: A4 landscape; margin: 10mm 12mm; }`
- Adapter les largeurs de tables pour ~277mm de contenu utile

### 2. En-tête style exemple
- Table bordurée avec logo entreprise à gauche, "FICHE DE PROCESSUS" + nom processus au centre, Code/Date/Version à droite avec logo marque
- Repris sur chaque page via `position: running(header)` ou repetition manuelle

### 3. Bloc meta simplifié (style formulaire tabulaire)
- Pilote du processus : valeur
- Finalité du processus : valeur
- Typologie : 3 cases Management / Réalisation / Support avec une cochée

### 4. Sections tabulaires
Chaque section est un tableau simple avec titre centré en gras (style de l'exemple) :
- **Données d'entrée** : liste numérotée
- **Données de sortie** : liste numérotée
- **Activités** : tableau Activité | Responsable
- **Processus en interaction** : liste
- **Enjeux internes** : tableau Enjeux | Moyens et actions | Date prévue
- **Enjeux externes** : idem
- **Parties intéressées** : tableau Parties | Attentes | Date
- **Risques** : tableau Risques | Moyens et actions pour faire face | Date prévue
- **Opportunités** : tableau Opportunités | Action à mettre en œuvre | Date prévue
- **Indicateurs** : tableau Indicateur | Objectif | Unité | Responsable | Fréquence | Moyens et actions (sans historique/résultats)
- **Ressources** et **Documents** : tableaux simples
- **BPMN** : si activé
- **Approbation** : bloc signatures

### 5. Supprimer du PDF
- Historique des modifications (pas dans l'exemple retenu)
- Résultats/valeurs des indicateurs (user request)
- Garder uniquement actions + moyens pour chaque element

### 6. Footer
- Texte de confidentialité + pagination "Page X sur Y"

## Fichier modifié

- `src/lib/exportProcessPdf.ts` — refonte complète de `buildHtml()`

