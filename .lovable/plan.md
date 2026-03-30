

# Refonte du module Gestion Documentaire — Dashboard, filtres avances, historique

## Problemes actuels

1. La page Documents est une simple liste de fichiers avec un filtre par processus uniquement
2. Pas de dashboard avec KPI documentaires
3. Pas de filtre par date ou type de document
4. Pas de support explicite des images (seul le PDF a un viewer)
5. Pas d'historique d'activite dedie (ajout, consultation, retrait)

## Plan d'implementation

### Phase 1 — Migration : enrichir la table `documents`

La table `documents` existe deja avec `type_document` (enum : procedure, instruction, formulaire, enregistrement, rapport, compte_rendu_audit, preuve). Il faut :

- Ajouter le type `image` a l'enum `doc_type` pour supporter les images
- Ajouter une colonne `consulte_count` (integer, default 0) pour tracker les consultations
- Ajouter une colonne `retired_at` (timestamptz, nullable) pour la date de retrait
- Ajouter une colonne `retired_by` (uuid, nullable) pour qui a retire le document

```sql
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'image';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS consulte_count integer DEFAULT 0;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS retired_at timestamptz;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS retired_by uuid;
```

### Phase 2 — Nouvelle page `Documents.tsx` avec onglets

Restructurer la page en 3 onglets :

**Onglet 1 — Dashboard documentaire**
- KPI cards : Total documents, Documents actifs, Documents archives/retires, Documents sans fichier, Repartition par type
- Graphiques Recharts : Donut par type de document, BarChart par processus, Line chart ajouts par mois (6 derniers mois)
- Top 5 documents les plus consultes

**Onglet 2 — Documents** (vue actuelle amelioree)
- Filtres : par type de document, par processus, par plage de dates (date creation), recherche texte sur titre
- Support fichiers : PDF + images (jpg, png, gif, webp, svg, bmp, tiff)
- Preview inline : PDF via PdfViewerDialog, images via Dialog avec `<img>`
- Indicateur visuel du type (icone differente pour image vs PDF vs autre)
- Accept sur le file input : `.pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff`

**Onglet 3 — Historique d'activite**
- Lire les `audit_logs` filtres sur `entity_type = 'documents'`
- Afficher : action (create/update/delete), titre du document, utilisateur, date/heure
- Filtres : par action, par date
- Badge colore par type d'action (vert = ajout, bleu = consultation, orange = modification, rouge = suppression)

### Phase 3 — Viewer d'images

Nouveau composant `ImageViewerDialog.tsx` :
- Dialog fullscreen avec l'image en `object-contain`
- Boutons zoom in/out
- Nom du fichier en header
- Reutilise le meme pattern que `PdfViewerDialog`

### Phase 4 — Integration sidebar

Deplacer "Documents" de la section "Manager processus" vers une position plus visible ou le garder la mais avec l'icone `FolderOpen` au lieu de `FileText` pour differencier la gestion documentaire.

## Architecture technique

```text
Documents.tsx (page)
├── Tab: Dashboard
│   ├── KPI Cards (total, actifs, retires, par type)
│   ├── Donut chart (types)
│   ├── Bar chart (par processus)
│   └── Line chart (ajouts mensuels)
├── Tab: Documents
│   ├── Filters (type, processus, dates, recherche)
│   ├── Document cards (avec preview PDF/image)
│   └── Upload dialog (PDF + images)
└── Tab: Historique
    ├── Filters (action, date)
    └── Timeline audit_logs(entity_type='documents')
```

## Fichiers modifies

| Fichier | Action |
|---|---|
| `supabase/migrations/xxx.sql` | Ajouter `image` a l'enum, colonnes `consulte_count`, `retired_at`, `retired_by` |
| `src/pages/Documents.tsx` | Refonte complete : 3 onglets (Dashboard, Documents, Historique) |
| `src/components/ImageViewerDialog.tsx` | Nouveau — viewer d'images en dialog |

## Contraintes

- Migration idempotente (`IF NOT EXISTS`, `ADD VALUE IF NOT EXISTS`)
- Les documents existants restent inchanges
- Les audit_logs existants sur `entity_type = 'documents'` alimentent l'historique sans nouvelle table
- Types d'images acceptes : PDF, JPG, JPEG, PNG, GIF, WEBP, SVG, BMP, TIFF
- Le viewer detecte automatiquement si c'est un PDF ou une image pour choisir le bon composant

