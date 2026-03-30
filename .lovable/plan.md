

# Configuration documentaire — Types, Tags et Permissions par acteur

## Objectif

Ajouter dans la configuration (SuperAdmin) une section "Documents" pour gérer les types de documents et les tags. Permettre le tagging des documents. Ajouter un système de permissions documentaires par acteur (lire, télécharger, supprimer) filtré par types et tags autorisés.

## Phase 1 — Migration : nouvelles tables

### `document_types` — Types de documents configurables
```sql
CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,  -- clé technique
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Seed avec les types existants de l'enum
```

### `document_tags` — Tags configurables
```sql
CREATE TABLE public.document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Seed : technique, graphique, juridique
```

### `document_tag_links` — Association documents ↔ tags (N:N)
```sql
CREATE TABLE public.document_tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  UNIQUE(document_id, tag_id)
);
```

### `document_actor_permissions` — Permissions documentaires par acteur
```sql
CREATE TABLE public.document_actor_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id UUID NOT NULL REFERENCES acteurs(id) ON DELETE CASCADE,
  can_read BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  allowed_type_ids UUID[] DEFAULT '{}',   -- types autorisés (vide = tous)
  allowed_tag_ids UUID[] DEFAULT '{}',    -- tags autorisés (vide = tous)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(acteur_id)
);
```

RLS : SELECT pour tous les authentifiés, INSERT/UPDATE/DELETE pour admin/rmq.

## Phase 2 — SuperAdmin : onglet "Documents"

Ajouter un 5e onglet dans SuperAdmin (icône `FolderOpen`) contenant :

**Section Types de documents** :
- Liste des types existants avec toggle actif/inactif
- Bouton "Ajouter un type" (label + code)
- Suppression avec confirmation

**Section Tags** :
- Liste des tags avec pastille de couleur
- Bouton "Ajouter un tag" (label + couleur)
- Suppression avec confirmation

## Phase 3 — Permissions documentaires par acteur

Nouvelle page ou section dans AdminPermissions (ou dans SuperAdmin onglet Documents) :

**Matrice acteur × permissions** :
- Liste des acteurs (fonctions)
- Pour chaque acteur : checkboxes Lire / Télécharger / Supprimer
- Multi-select pour types autorisés (vide = tous)
- Multi-select pour tags autorisés (vide = tous)
- Sauvegarde dans `document_actor_permissions`

## Phase 4 — Intégration dans Documents.tsx

**Upload** :
- Remplacer l'enum statique `type_document` par un select dynamique depuis `document_types`
- Ajouter un multi-select de tags lors de l'upload

**Affichage** :
- Afficher les tags sous forme de badges colorés sur chaque document
- Ajouter un filtre par tag

**Contrôle d'accès** :
- Avant chaque action (voir/télécharger/supprimer), vérifier `document_actor_permissions` pour l'acteur de l'utilisateur courant
- Si l'acteur a des restrictions de type/tag, filtrer les documents visibles

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `supabase/migrations/xxx.sql` | Tables `document_types`, `document_tags`, `document_tag_links`, `document_actor_permissions` + seed + RLS |
| `src/pages/SuperAdmin.tsx` | Nouvel onglet "Documents" avec CRUD types + tags |
| `src/pages/Documents.tsx` | Types dynamiques, tags multi-select, filtres, contrôle d'accès par acteur |
| `src/pages/AdminPermissions.tsx` | Section permissions documentaires par acteur (ou intégré dans SuperAdmin) |

## Contraintes

- Migration idempotente (`IF NOT EXISTS`)
- Les documents existants conservent leur `type_document` enum — le select dynamique utilise les `document_types` mais reste compatible
- Les tags sont optionnels sur les documents
- Permissions vides (allowed_type_ids/allowed_tag_ids = `{}`) = accès à tous les types/tags
- Admin et Super Admin contournent toujours les restrictions

