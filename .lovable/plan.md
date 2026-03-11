

# Plan: Refonte du Systeme de Roles et Permissions

## 1. Migration Base de Donnees

### 1.1 Ajouter le role "acteur" a l'enum
```sql
ALTER TYPE public.app_role ADD VALUE 'acteur';
```

### 1.2 Supprimer la contrainte UNIQUE(user_id, role) si elle empeche les roles multiples
La table `user_roles` a deja `UNIQUE(user_id, role)` ce qui permet d'avoir plusieurs lignes par utilisateur avec des roles differents. C'est deja compatible avec les roles multiples (max 2).

## 2. AuthContext - Support Multi-Roles

**Fichier**: `src/contexts/AuthContext.tsx`

- Changer `role: AppRole | null` en `roles: AppRole[]`
- Ajouter `acteur` au type `AppRole`
- Fetch tous les roles (supprimer `.single()`, utiliser `.select("role").eq("user_id", userId)`)
- Ajouter helper `hasRole(role: AppRole): boolean` qui verifie si le role est dans le tableau
- Exposer `roles` et `hasRole` dans le contexte

## 3. Sidebar - Visibilite par Role

**Fichier**: `src/components/AppSidebar.tsx`

Appliquer la matrice d'acces:
- **Menu Principal** (Dashboard, Acteurs): visible par tous
- **Menu Processus** (Processus, Cartographie, BPMN): masque pour "acteur" seul
- **Menu Manager Processus** (Documents, Indicateurs, Risques, Incidents, Enjeux): masque pour "acteur" et "auditeur" (auditeur = lecture seule via les pages)
- **Menu Audit & Amelioration**: visible pour admin, rmq, auditeur
- **Menu Administration**: visible pour admin uniquement (plus RMQ)

## 4. Header - Bouton Logs

**Fichier**: `src/components/AppLayout.tsx`

- Ajouter un bouton "Logs" (icone `ScrollText`) dans le header, visible uniquement pour admin et rmq
- Au clic, naviguer vers `/journal`

## 5. Page Utilisateurs - Admin Only + Multi-Roles

**Fichier**: `src/pages/Utilisateurs.tsx`

- Restreindre l'acces a admin uniquement (plus RMQ)
- Supporter l'affichage et l'attribution de 2 roles par utilisateur (checkboxes ou multi-select au lieu d'un Select unique)
- Ajouter le role "acteur" dans la liste des roles disponibles
- Admin peut: creer utilisateurs, modifier, desactiver, reinitialiser mot de passe

### 5.1 Creation d'utilisateur par l'admin
- Ajouter un bouton "Nouvel utilisateur" qui ouvre un formulaire (nom, prenom, email, fonction, mot de passe)
- Utiliser une edge function `admin-create-user` qui appelle `supabase.auth.admin.createUser()` avec le service role key

### 5.2 Reinitialisation de mot de passe
- Bouton par utilisateur pour reinitialiser le mot de passe
- Edge function `admin-reset-password` qui appelle `supabase.auth.admin.updateUserById()` pour changer le mot de passe

## 6. Page Journal - Acces Admin + RMQ

**Fichier**: `src/pages/Journal.tsx`

- Autoriser l'acces pour admin en plus de rmq (deja dans les RLS)

## 7. Mise a jour des verifications de role dans toutes les pages

Remplacer tous les `role === "rmq"` / `role === "admin"` par `hasRole("rmq")` / `hasRole("admin")` dans:
- `Processus.tsx` - filtrer pour responsable_processus (ne voir que ses processus)
- `ProcessDetail.tsx` - restrictions d'edition
- `Documents.tsx`, `Indicateurs.tsx`, `Risques.tsx`, `Incidents.tsx`
- `Audits.tsx`, `NonConformites.tsx`, `Actions.tsx`
- `Acteurs.tsx`, `EnjeuContexte.tsx`
- `Cartographie.tsx`, `Bpmn.tsx`
- `AdminPasswordDialog.tsx`

## 8. Filtrage Processus pour Responsable

**Fichier**: `src/pages/Processus.tsx`

- Si l'utilisateur n'a que le role `responsable_processus` (pas admin/rmq), filtrer la requete pour ne retourner que les processus ou `responsable_id = auth.uid()`
- Masquer le bouton de creation si pas rmq/admin
- Bloquer l'edition sur processus valide/archive

## 9. Role Acteur - Restrictions

- Le role `acteur` ne voit que: Dashboard, Acteurs (menu principal)
- Consultation seule de tous les processus ou il est implique
- Pas d'acces aux menus Manager Processus ni Audit

## 10. Edge Functions a creer

### `admin-create-user`
- Valide que l'appelant est admin (via JWT + has_role)
- Cree l'utilisateur via `supabase.auth.admin.createUser()`
- Assigne les roles dans `user_roles`

### `admin-reset-password`  
- Valide que l'appelant est admin
- Met a jour le mot de passe via `supabase.auth.admin.updateUserById()`

## Ordre d'implementation

1. Migration DB (ajouter role acteur)
2. AuthContext multi-roles + hasRole
3. Edge functions admin
4. Page Utilisateurs refonte
5. Sidebar visibilite
6. Header bouton Logs
7. Mise a jour verifications roles dans toutes les pages
8. Filtrage processus responsable
9. Page Journal acces admin

