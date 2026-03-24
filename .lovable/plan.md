

# Renommer "Revue de direction" → "Revue de processus" + Préparer le futur module §9.3

## Contexte

Le module actuel "Revue de direction" gère en réalité des **revues de processus** (comptes rendus de pilotage, tableau de bord processus, maturité). Il sera renommé en conséquence.

Une **vraie Revue de direction** conforme à l'article 9.3 de la norme ISO 9001 sera créée dans une prochaine étape comme module distinct.

## Modifications (étape 1 — renommage uniquement)

### 1. Labels UI — 6 fichiers

| Fichier | Changement |
|---------|-----------|
| `AppSidebar.tsx` (l.52) | `"Revue de processus"` |
| `GlobalSearch.tsx` (l.33) | `"Revue de processus"` |
| `RevueDirection.tsx` (l.76, 107, 125, 152, 206) | Tous les textes visibles → "revue de processus" |
| `defaultPermissions.ts` (l.68) | Label `"Revue de processus"` |
| `SurveyBuilder.tsx` (l.64) | `"Préparer la revue de processus"` |
| `SatisfactionClient.tsx` (l.62) | `"Revue processus (§9.3)"` |

### 2. Aide contextuelle — `helpDefinitions.ts`

- Ligne 565 : title → `"Revue de processus"`
- Ligne 569 : definition → remplacer "revue de direction" par "revue de processus"

### 3. Export PDF — `exportStrategicPdf.ts`

- Lignes 384, 440, 442, 520 : titres HTML/header/footer → `"Revue de Processus"`
- Ligne 523 : nom fichier → `revue-processus-{ref}.pdf`

### Ce qui ne change PAS (clés internes)

- Route URL `/revue-direction` — sera réattribuée au futur module §9.3
- Clé module `revue_direction` — idem, sera transférée
- Table DB `management_reviews`
- Nom fichier `RevueDirection.tsx`
- Edge function `check-deadlines` (URL interne)

> **Note** : lors de la prochaine étape (création du vrai module Revue de direction §9.3), la route `/revue-direction` et la clé `revue_direction` seront réattribuées au nouveau module, et le module actuel recevra une nouvelle route `/revue-processus` et une nouvelle clé `revue_processus`.

