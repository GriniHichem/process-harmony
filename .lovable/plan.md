
Objectif: corriger définitivement 2 problèmes en même temps:
1) PDF “consultation” vide/placeholder “Ouvrir”
2) Admin/Super Admin ne peuvent pas ajouter des documents

Analyse approfondie (constats réels)
- Do I know what the issue is? Oui.
- Cause A (bloquante ajout): le upload fichier vers le bucket `documents` échoue en 403 RLS.
  - Preuve réseau: `POST /storage/v1/object/documents/...` => `new row violates row-level security policy`.
  - Les policies storage actuelles autorisent seulement `rmq` et `responsable_processus` pour INSERT/UPDATE, pas `admin`/`super_admin`.
- Cause B (liaison doc-processus cassée): policies `document_processes` créées en `AS RESTRICTIVE` (insert/delete) se combinent en AND et bloquent presque tout le monde.
- Cause C (PDF non visible): le rendu repose sur le viewer PDF natif du navigateur via `iframe + blob`, qui dans ce contexte affiche un écran intermédiaire “Ouvrir” au lieu du document (comportement navigateur, pas contenu PDF).

Plan de correction
1) Corriger les policies backend (migration SQL)
- Fichier: nouvelle migration `supabase/migrations/<timestamp>_fix_documents_rls.sql`
- Storage bucket `documents`:
  - Recréer policies INSERT/UPDATE/DELETE pour inclure:
    - INSERT/UPDATE: `rmq`, `responsable_processus`, `admin`, `super_admin`
    - DELETE: `rmq`, `admin`, `super_admin`
- Table `public.document_processes`:
  - Supprimer les policies `AS RESTRICTIVE` problématiques existantes
  - Recréer des policies permissives propres (OR par rôles):
    - INSERT: `rmq`, `responsable_processus`, `admin`, `super_admin`
    - DELETE: `rmq`, `admin`, `super_admin`
- Résultat attendu:
  - Admin/Super Admin peuvent enfin uploader et lier les documents
  - Plus d’erreurs RLS cachées au moment de l’association

2) Remplacer le viewer PDF fragile par un viewer robuste
- Créer un composant partagé, ex: `src/components/SecurePdfViewerDialog.tsx`
- Rendu PDF via `react-pdf` (PDF.js), pas via plugin natif navigateur.
- Fonctionnalités:
  - ouverture dans Dialog
  - plein écran
  - pagination (page suivante/précédente)
  - zoom +/- (optionnel mais recommandé)
  - état de chargement + message d’erreur lisible
- Avantage: rendu fiable dans l’app, sans écran “Ouvrir”.

3) Brancher ce composant dans les 2 écrans
- `src/pages/Documents.tsx`
- `src/pages/ProcessDetail.tsx`
- Garder la règle métier:
  - Consultation PDF: tous les utilisateurs autorisés à voir le module
  - Téléchargement: uniquement `rmq`, `admin`, `super_admin`
- Conserver le comportement non-PDF: téléchargement visible seulement pour ces rôles.

4) Solidifier le flux d’ajout document côté UI
- Dans `handleUpload`:
  - message d’erreur explicite si upload storage refusé (RLS)
  - ne pas tenter insertion `document_processes` si création document échoue
  - feedback clair si association processus échoue
- Option recommandée: invalider/recharger la liste seulement après succès complet.

Validation E2E (obligatoire après fix)
- Cas 1: super_admin ajoute un PDF + associe 1..n processus => succès complet
- Cas 2: admin idem => succès complet
- Cas 3: responsable_processus => upload/association selon règles
- Cas 4: consultant/acteur => pas de bouton téléchargement; consultation PDF fonctionne
- Cas 5: ProcessDetail > Ressources => le même PDF s’affiche correctement en modal + plein écran
- Cas 6: vérifier qu’aucune erreur RLS n’apparaît dans réseau pour upload/association

Détails techniques (section dédiée)
- Pourquoi le PDF est “vide” alors que le fichier est bon:
  - le binaire PDF est bien reçu (`%PDF-1.4`), mais le viewer natif embarqué dans `iframe` n’est pas fiable dans ce contexte.
- Pourquoi admin/super_admin ne peuvent pas ajouter:
  - policies storage incomplètes (rôles manquants) + policies `document_processes` en mode restrictive mal combinées.
- Impact sécurité:
  - on ne ré-ouvre pas les droits globalement; on élargit uniquement aux rôles métiers attendus.
  - la restriction téléchargement UI reste active (`rmq/admin/super_admin`).
