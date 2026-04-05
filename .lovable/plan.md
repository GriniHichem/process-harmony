

# Gestion d'accès par projet — Responsable, collaborateurs et visibilité

## Vue d'ensemble

Ajouter un **responsable de projet** et un système de **collaborateurs** avec niveaux d'accès (lecture / écriture), plus un toggle **public/privé** par projet. En mode privé, seuls le responsable et les collaborateurs ajoutés peuvent voir le projet.

## Architecture

```text
projects
  ├── responsable_user_id (uuid)  ← nouveau champ
  ├── visibility (text: 'public' | 'private')  ← nouveau champ
  └── project_collaborators (nouvelle table)
        ├── user_id (uuid)
        ├── access_level ('read' | 'write')
        └── project_id (uuid)
```

**Règles d'accès :**
- **Public** : tous les utilisateurs (selon permissions module "actions") voient le projet
- **Privé** : seuls le responsable + collaborateurs voient le projet ; les collaborateurs "write" peuvent modifier, "read" seulement consulter
- **Admin/Super Admin** : accès total toujours

## Changements techniques

### 1. Migration SQL

- Ajouter `responsable_user_id uuid REFERENCES profiles(id)` et `visibility text DEFAULT 'public'` à la table `projects`
- Créer table `project_collaborators` (project_id, user_id, access_level, created_at) avec UNIQUE(project_id, user_id)
- RLS sur `project_collaborators` : authenticated full access
- Mettre à jour RLS sur `projects` : SELECT filtré par visibilité (public = tous authenticated, privé = responsable + collaborateurs + admin)

### 2. Composant `ProjectCollaborators.tsx` (nouveau)

Dans la page ProjectDetail, onglet ou section dans "Vue d'ensemble" :
- Afficher le responsable du projet (sélecteur profil)
- Toggle Public/Privé
- Liste des collaborateurs avec leur niveau d'accès (read/write)
- Ajout de collaborateurs via sélecteur de profils actifs
- Suppression d'un collaborateur

### 3. Modifications ProjectForm.tsx

- Ajouter champ "Responsable du projet" (select profils) et toggle "Visibilité" (public/privé) dans le formulaire de création/édition

### 4. Modifications ProjectDetail.tsx

- Fetch du responsable et des collaborateurs
- Afficher le responsable dans l'en-tête
- Nouvelle carte "Accès & Collaborateurs" dans l'onglet Vue d'ensemble
- Adapter `canEdit`/`canRead` : si privé, vérifier si l'utilisateur courant est responsable ou collaborateur write/read

### 5. Modifications Actions.tsx (liste des projets)

- Filtrer les projets privés côté client : ne montrer que ceux où l'utilisateur est responsable ou collaborateur (en complément du RLS serveur)

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Ajouter colonnes `projects` + créer `project_collaborators` + RLS |
| `src/components/projects/ProjectCollaborators.tsx` | **Nouveau** — UI gestion accès |
| `src/components/projects/ProjectForm.tsx` | Ajouter responsable + visibilité |
| `src/pages/ProjectDetail.tsx` | Intégrer collaborateurs, adapter permissions |
| `src/pages/Actions.tsx` | Filtrer projets privés |

