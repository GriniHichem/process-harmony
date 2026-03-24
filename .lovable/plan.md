

# ✅ Étape 1 — Renommage "Revue de direction" → "Revue de processus" (TERMINÉ)

Tous les labels UI, aide contextuelle et exports PDF ont été mis à jour.

# ✅ Étape 2 — Module "Revue de direction ISO 9001 §9.3" (TERMINÉ)

## Réalisé

- Migration DB : colonne `type_revue` ajoutée à `management_reviews` (valeurs : `processus` / `direction`)
- Page `RevueDirection.tsx` filtre sur `type_revue = 'processus'`
- Nouvelle page `RevueDirectionISO.tsx` filtre sur `type_revue = 'direction'`
- Catégories ISO §9.3.2 (a-f) pré-peuplées automatiquement à la création
- Composants `ReviewInputItemsEditor` / `ReviewDecisionsEditor` réutilisés
- Route `/revue-direction-iso`, module `revue_direction_iso`, permissions configurées
- Navigation sidebar, recherche globale, aide contextuelle, export PDF ISO
