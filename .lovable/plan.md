

# Refonte du module Non-Conformites — Actions structurees + Analyse causes racines

## Problemes actuels

1. **Actions = champ texte libre** (`plan_action`, `resultats_actions`) au lieu d'actions structurees comme dans le module risques
2. **Analyse de cause racine = un seul champ texte** (`cause_racine`) sans methode guidee
3. **Pas d'affectation de responsables** aux actions correctives (pas d'ActeurUserSelect)
4. **Pas de suivi** des actions (statut, deadline, notes)

## Plan d'implementation

### Phase 1 — Migration : nouvelles tables

**Table `nc_actions`** (calquee sur `risk_actions`) :
```sql
CREATE TABLE public.nc_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id UUID NOT NULL REFERENCES nonconformities(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  type_action TEXT DEFAULT 'corrective', -- corrective, preventive, amelioration
  statut TEXT DEFAULT 'a_faire',
  date_prevue DATE,
  deadline DATE,
  responsable TEXT, -- acteur_id
  responsable_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Table `nc_root_cause_analyses`** (une analyse par NC) :
```sql
CREATE TABLE public.nc_root_cause_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id UUID NOT NULL REFERENCES nonconformities(id) ON DELETE CASCADE,
  methode TEXT NOT NULL, -- 'ishikawa_5m', 'ishikawa_7m', '5_pourquoi', 'qqoqcp', 'pareto', 'amdec'
  data JSONB DEFAULT '{}', -- contenu structure selon la methode
  conclusion TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

RLS identique aux `risk_actions` (select all authenticated, insert/update/delete pour rmq, responsable_processus, admin).

### Phase 2 — Composant `NcMoyensActions.tsx`

Nouveau composant base sur `RiskMoyensActions` mais adapte aux NC :
- CRUD des `nc_actions` avec `ActeurUserSelect` pour le responsable
- Type d'action (corrective/preventive/amelioration) en plus du statut
- Meme ItemCard avec statut, deadline, notes, responsable
- Pas de section "Moyens" (specifique aux risques)

### Phase 3 — Composant `RootCauseAnalysis.tsx`

Composant d'analyse des causes racines avec :

**Etape 1 — Choix de la methode** : Select parmi 6 methodes avec description

**Etape 2 — Formulaire dynamique** selon la methode choisie :

- **Ishikawa 5M/7M** : 5 ou 7 categories (Matiere, Milieu, Methodes, Materiel, Main-d'oeuvre, + Management, Mesure pour 7M). Chaque categorie = liste de causes editables (ajouter/supprimer). Stocke dans JSONB : `{ categories: { matiere: ["cause1", "cause2"], milieu: [...] } }`

- **5 Pourquoi** : chaine de champs texte (Pourquoi 1 → Pourquoi 2 → ... → Cause racine). Bouton "Ajouter un pourquoi" jusqu'a 7 niveaux. JSONB : `{ pourquois: ["reponse1", "reponse2", ...] }`

- **QQOQCP** : 7 champs structures (Qui, Quoi, Ou, Quand, Comment, Combien, Pourquoi). JSONB : `{ qui: "...", quoi: "...", ... }`

- **Pareto** : tableau causes/frequences triable. JSONB : `{ items: [{cause: "...", frequence: 5}, ...] }`

- **AMDEC** : tableau Mode de defaillance / Effet / Cause / Gravite / Occurrence / Detection / IPR. JSONB : `{ items: [{mode: "...", effet: "...", cause: "...", gravite: 3, occurrence: 2, detection: 4, ipr: 24}] }`

**Etape 3 — Conclusion** : champ texte pour la synthese

### Phase 4 — Refonte de `NonConformites.tsx`

**Onglet "Analyse"** : remplacer le textarea par `<RootCauseAnalysis ncId={nc.id} canEdit={canEdit} />`

**Onglet "Actions"** : remplacer les textareas (`plan_action`, `resultats_actions`) par `<NcMoyensActions ncId={nc.id} canEdit={canEdit} />`. Garder les champs `verification_efficacite` et `resultats_actions` comme champs de synthese au-dessus des actions structurees.

**Vue detail** : afficher un resume de l'analyse (methode + conclusion) et le nombre d'actions avec leur statut global.

## Fichiers

| Fichier | Action |
|---|---|
| `supabase/migrations/xxx.sql` | Tables `nc_actions` + `nc_root_cause_analyses` + RLS + triggers |
| `src/components/NcMoyensActions.tsx` | Nouveau — CRUD actions NC (calque sur RiskMoyensActions) |
| `src/components/RootCauseAnalysis.tsx` | Nouveau — analyse structuree multi-methode |
| `src/pages/NonConformites.tsx` | Integration des 2 composants dans detail + edit |

## Contraintes

- Migrations idempotentes
- Les anciens champs texte (`cause_racine`, `plan_action`) restent en base pour retrocompatibilite mais ne sont plus edites dans l'UI
- RLS coherente avec les tables existantes
- Triggers de notification et audit_logs sur `nc_actions`

