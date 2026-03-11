

# Plan — Module de gestion d'accès granulaire

## Contexte

Actuellement, les permissions sont codées en dur dans chaque page via `hasRole()`. Chaque rôle a des droits fixes (admin = tout, rmq = presque tout, etc.). L'objectif est d'ajouter un système de **permissions fines par module** configurable depuis l'interface d'administration, tout en conservant les droits par défaut des rôles existants comme base non modifiable.

## Architecture

```text
┌──────────────────────────────────────────┐
│          role_permissions (table)         │
│  role | module | read | read_detail |    │
│        edit | delete                     │
│  (ex: "auditeur" | "risques" | true |    │
│   true | false | false)                  │
└──────────────────────────────────────────┘
         ↓ chargé au login
┌──────────────────────────────────────────┐
│        AuthContext (permissions map)      │
│  hasPermission(module, level) → boolean  │
│  Merge: defaults du rôle + overrides DB  │
└──────────────────────────────────────────┘
         ↓ utilisé par
┌──────────────────────────────────────────┐
│  Chaque page utilise hasPermission()     │
│  au lieu de hasRole() pour les actions   │
└──────────────────────────────────────────┘
```

## 1. Base de données

Nouvelle table `role_permissions` :

| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| role | app_role NOT NULL | Le rôle concerné |
| module | text NOT NULL | Ex: "processus", "risques", "audits"... |
| can_read | boolean DEFAULT false | Voir la liste |
| can_read_detail | boolean DEFAULT false | Voir les détails / expandre |
| can_edit | boolean DEFAULT false | Créer / modifier |
| can_delete | boolean DEFAULT false | Supprimer |
| UNIQUE(role, module) | | Une seule ligne par rôle × module |

RLS : SELECT tous authenticated, INSERT/UPDATE/DELETE admin uniquement.

Les **modules** couverts (17 modules) :
`processus`, `cartographie`, `bpmn`, `evaluation_processus`, `documents`, `indicateurs`, `risques`, `incidents`, `enjeux_contexte`, `politique_qualite`, `revue_direction`, `competences`, `satisfaction_client`, `fournisseurs`, `audits`, `non_conformites`, `actions`

## 2. Permissions par défaut (non modifiables, en code)

Définir dans un fichier `src/lib/defaultPermissions.ts` une matrice complète des permissions par défaut de chaque rôle, basée sur le comportement actuel. Ces valeurs sont utilisées comme **base**. Les overrides en DB viennent s'y ajouter ou restreindre.

Règle de merge : `admin` a toujours tout (non overridable). Pour les autres rôles, si un override existe en DB il prime, sinon le défaut s'applique.

## 3. Modifications AuthContext

- Charger `role_permissions` au login (une requête supplémentaire)
- Nouvelle fonction `hasPermission(module: string, level: "read" | "read_detail" | "edit" | "delete"): boolean`
- Merge les defaults du rôle avec les overrides DB
- Admin bypass total (toujours true)

## 4. Page d'administration des permissions

Nouvelle page `/admin/permissions` (ou onglet dans Utilisateurs) accessible admin uniquement.

UI : Tableau croisé **rôles (colonnes) × modules (lignes)**, chaque cellule contient 4 checkboxes (lecture, détail, modification, suppression). Les cases du rôle `admin` sont grisées et cochées.

Les valeurs modifiées sont sauvegardées en upsert dans `role_permissions`.

## 5. Adaptation des pages existantes

Remplacer progressivement les appels `hasRole()` par `hasPermission()` dans chaque page :

| Page | Remplacement |
|---|---|
| Processus, ProcessDetail | `hasPermission("processus", "edit/delete")` |
| Cartographie | `hasPermission("cartographie", "read")` |
| BPMN | `hasPermission("bpmn", "edit")` |
| Documents | `hasPermission("documents", "edit/delete")` |
| Indicateurs | `hasPermission("indicateurs", "edit/delete/read_detail")` |
| Risques | `hasPermission("risques", "edit/delete/read_detail")` |
| Incidents | `hasPermission("incidents", "edit")` |
| Enjeux contexte | `hasPermission("enjeux_contexte", "edit/delete")` |
| Politique qualité | `hasPermission("politique_qualite", "edit")` |
| Revue direction | `hasPermission("revue_direction", "edit")` |
| Compétences | `hasPermission("competences", "edit")` |
| Satisfaction | `hasPermission("satisfaction_client", "edit")` |
| Fournisseurs | `hasPermission("fournisseurs", "edit")` |
| Audits | `hasPermission("audits", "edit/delete")` |
| Non-conformités | `hasPermission("non_conformites", "edit/delete")` |
| Actions | `hasPermission("actions", "edit/delete")` |
| Évaluation processus | `hasPermission("evaluation_processus", "edit")` |

La sidebar et les routes seront aussi adaptées : `hasPermission(module, "read")` contrôle la visibilité du lien et l'accès à la route.

## 6. Étapes d'implémentation (avec tests entre chaque)

1. **Migration DB** : créer `role_permissions` + RLS + seed avec les valeurs par défaut
2. **`defaultPermissions.ts`** : matrice codée en dur des defaults actuels
3. **AuthContext** : ajouter `permissions`, `hasPermission()`, charger depuis DB
4. **Page admin permissions** : UI tableau croisé + sauvegarde
5. **Test** : vérifier que tout fonctionne identiquement avec les defaults
6. **Adapter les pages** (par groupes de 3-4 pages, test après chaque groupe) :
   - Groupe 1 : Processus, Documents, Indicateurs, Risques
   - Groupe 2 : Audits, NC, Actions, Incidents
   - Groupe 3 : Politique qualité, Revue direction, Compétences, Satisfaction, Fournisseurs
   - Groupe 4 : Cartographie, BPMN, Évaluation processus, Enjeux
7. **Adapter Sidebar + RoleGuard** pour utiliser `hasPermission`
8. **Test final complet**

## Fichiers impactés

- 1 migration SQL
- `src/lib/defaultPermissions.ts` (nouveau)
- `src/contexts/AuthContext.tsx`
- `src/pages/AdminPermissions.tsx` (nouveau) ou intégré dans Utilisateurs
- `src/components/AppSidebar.tsx`
- `src/components/RoleGuard.tsx`
- `src/App.tsx`
- 17 pages de modules (remplacement `hasRole` → `hasPermission`)

