

# Permissions Avancées par Processus

## Vue d'ensemble

Ajouter un système de permissions granulaires **par processus** en complément du système existant par rôle/module. Chaque rôle (standard ou personnalisé) pourra avoir des droits différents selon le processus, avec 5 niveaux : Lecture, Détail, Commenter, Modifier, Générer version.

## Architecture

```text
Système actuel (conservé) :
  role → module → can_read / can_read_detail / can_edit / can_delete

Nouveau système (ajouté) :
  role → processus → can_read / can_detail / can_comment / can_edit / can_version

Logique de résolution :
  1. Vérifier permissions processus-spécifiques (table process_role_permissions)
  2. Si aucune → hériter des permissions globales du module "processus"
  3. Admin/Super Admin → toujours tout
```

## Étapes d'implémentation

### Phase 1 — Base de données

**Nouvelle table `process_role_permissions`** :
- `id` UUID PK
- `role` app_role (nullable — pour rôles standards)
- `custom_role_id` UUID FK → custom_roles (nullable — pour rôles personnalisés)
- `process_id` UUID FK → processes NOT NULL
- `can_read` boolean default false
- `can_detail` boolean default false
- `can_comment` boolean default false
- `can_edit` boolean default false
- `can_version` boolean default false
- `created_at`, `updated_at`
- Contrainte UNIQUE sur (role, custom_role_id, process_id)
- RLS : admin/super_admin/rmq full access, authenticated read

**Nouvelle table `process_comments`** (pour le niveau "commenter") :
- `id` UUID PK
- `process_id` UUID FK → processes
- `user_id` UUID FK → profiles
- `content` text NOT NULL
- `created_at`
- RLS : authenticated insert si can_comment, select si can_read

**Table `permission_audit_log`** (historique des changements de droits) :
- `id`, `changed_by` UUID, `target_role`, `target_custom_role_id`, `process_id`, `old_perms` JSONB, `new_perms` JSONB, `changed_at`

### Phase 2 — Logique métier

**Nouveau hook `useProcessPermissions.ts`** :
- Charge les permissions processus-spécifiques pour l'utilisateur courant
- Fonction `hasProcessPermission(processId, level)` qui résout : override processus → fallback global
- Cache les résultats pour éviter des requêtes répétées

**Mise à jour `AuthContext.tsx`** :
- Exposer `hasProcessPermission(processId, level)` dans le contexte
- Charger les process_role_permissions au login (batch)

**Mise à jour `ProcessDetail.tsx`** :
- Utiliser `hasProcessPermission` pour conditionner :
  - Onglets visibles (Général = can_read, Indicateurs/Risques/Actions = can_detail)
  - Bouton "Enregistrer" = can_edit
  - Bouton "Nouvelle version" = can_version
  - Section commentaires = can_comment
  - Masquer/désactiver selon le niveau

**Mise à jour `Processus.tsx`** :
- Filtrer la liste selon can_read par processus

### Phase 3 — Interface d'administration

**Nouvelle page `AdminProcessPermissions.tsx`** :
- Matrice : lignes = rôles (standards + personnalisés), colonnes = processus
- Pour chaque cellule : 5 checkboxes (read/detail/comment/edit/version)
- Filtres : par rôle, par type de processus, par statut
- Actions :
  - "Copier les droits" d'un rôle vers un autre
  - "Appliquer un modèle" (lecture seule, accès complet, etc.)
  - "Réinitialiser" (supprimer les overrides → retour à l'héritage global)
- Badge visuel quand un processus a des permissions spécifiques vs héritage
- Bouton "Prévisualiser" → simule la vue d'un rôle donné

**Intégration dans la navigation** :
- Nouveau lien dans la section Admin : "Permissions processus"
- Ajout du module `"permissions_processus"` dans la matrice de modules

### Phase 4 — Fonctionnalités avancées

- **Historique des permissions** : table `permission_audit_log` consultable depuis l'interface admin
- **Verrouillage versions publiées** : processus validé/archivé → can_edit automatiquement bloqué sauf can_version pour rôles autorisés
- **Commentaires processus** : nouvelle section dans ProcessDetail, visible si can_detail, éditable si can_comment

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Créer `process_role_permissions`, `process_comments`, `permission_audit_log` + RLS |
| `src/hooks/useProcessPermissions.ts` | **Nouveau** — logique de résolution des permissions processus |
| `src/contexts/AuthContext.tsx` | Exposer `hasProcessPermission` |
| `src/pages/AdminProcessPermissions.tsx` | **Nouveau** — interface matrice admin |
| `src/pages/ProcessDetail.tsx` | Conditionner onglets/boutons par permission processus |
| `src/pages/Processus.tsx` | Filtrer liste par can_read processus |
| `src/lib/defaultPermissions.ts` | Ajouter type `ProcessPermissionLevel` |
| `src/components/AppSidebar.tsx` | Ajouter lien "Permissions processus" |
| `src/App.tsx` | Ajouter route `/admin/permissions-processus` |
| `src/components/ProcessComments.tsx` | **Nouveau** — section commentaires processus |

## Règles de sécurité

- RLS sur `process_role_permissions` : seuls admin/super_admin/rmq peuvent modifier
- RLS sur `process_comments` : insert conditionné par permission can_comment (via security definer function)
- Les permissions processus sont vérifiées côté serveur (RLS) ET côté client (hook)
- Admin/Super Admin bypasse toujours toutes les restrictions

