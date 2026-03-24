

# Nouveau module : Revue de direction ISO 9001 §9.3

## Architecture

Reutiliser la table `management_reviews` existante en ajoutant une colonne `type_revue` (`'processus'` par defaut, `'direction'` pour §9.3). Les tables enfants `review_input_items` et `review_decisions` sont deja generiques et fonctionnent sans modification.

La page existante `RevueDirection.tsx` filtre sur `type_revue = 'processus'`. Une nouvelle page `RevueDirectionISO.tsx` filtre sur `type_revue = 'direction'` avec une UI structuree selon §9.3.

## Plan d'implementation

### 1. Migration DB
- Ajouter colonne `type_revue TEXT DEFAULT 'processus'` a `management_reviews`
- Mettre a jour les lignes existantes : `type_revue = 'processus'`

### 2. Nouveau module permissions
- Ajouter `revue_direction_iso` dans `AppModule` et `defaultPermissions.ts`
- Label : "Revue de direction (§9.3)"
- Permissions identiques au pattern existant (admin/RMQ = full, autres = lecture)

### 3. Nouvelle page `src/pages/RevueDirectionISO.tsx`

UI fullscreen identique a `RevueDirection.tsx` mais avec des sections §9.3 structurees :

**Sidebar sections :**
- Participants (meme composant `ParticipantSelector`)
- §9.3.2 Elements d'entree — avec categories pre-definies ISO :
  - a) Actions des revues precedentes (auto-lien vers revues anterieures)
  - b) Enjeux externes/internes (lien `context_issues`)
  - c) Performance SMQ :
    - Satisfaction clients (lien `satisfaction`)
    - Objectifs qualite (lien `indicateurs`)
    - Performance processus (lien `processus`)
    - NC et actions correctives (lien `nc`, `actions`)
    - Resultats surveillance (lien `indicateurs`)
    - Resultats d'audit (lien `audits`)
    - Prestataires externes (lien `fournisseurs`)
  - d) Adequation des ressources (point libre + `competences`)
  - e) Risques et opportunites (lien `risques`)
  - f) Opportunites d'amelioration (point libre)
- §9.3.3 Elements de sortie — avec categories pre-definies :
  - a) Opportunites d'amelioration (decisions/actions)
  - b) Changements SMQ (decisions)
  - c) Besoins en ressources (decisions/actions)
- Compte rendu (RichTextEditor)

Les categories §9.3.2 sont des **items pre-crees automatiquement** dans `review_input_items` a la creation de la revue, servant de structure. L'utilisateur ajoute des sous-elements lies aux entites existantes sous chaque categorie.

### 4. Route et navigation
- Route : `/revue-direction-iso` dans `App.tsx`
- Sidebar : ajouter dans `pilotageSMQItems` apres "Revue de processus"
- Icone : `Target` ou `Crown`
- Module : `revue_direction_iso`

### 5. Export PDF
- Nouvelle fonction `exportRevueDirectionIsoPdf()` dans `exportStrategicPdf.ts`
- Structure §9.3 avec sections numerotees (9.3.2.a, 9.3.2.b, etc.)

### 6. Help definitions
- Ajouter entree `revue_direction_iso` dans `helpDefinitions.ts`
- Definition basee sur §9.3.1 de la norme

### 7. GlobalSearch
- Ajouter recherche dans `management_reviews` filtree par `type_revue = 'direction'`
- Type label : "Revue de direction"

## Details techniques

- La colonne `type_revue` permet de partager l'infrastructure existante sans duplication de tables
- Les `review_input_items` avec `parent_id` supportent deja la hierarchie necessaire pour les sous-categories §9.3.2.c
- La creation d'une revue de direction pre-peuple automatiquement les 9 categories racines (a-f pour entrees, a-c pour sorties)
- Les composants `ReviewInputItemsEditor` et `ReviewDecisionsEditor` sont reutilises tels quels

