

# Déplacer Notifications & Documents config vers Administration

## Ce qui change

### 1. Sidebar — `AppSidebar.tsx`
Ajouter 2 entrées dans `adminItems` (section Administration existante) :
```
{ title: "Config. notifications", url: "/admin/notifications", icon: Bell, module: "notifications" }
{ title: "Config. documents", url: "/admin/documents-config", icon: FolderOpen, module: "gestion_documentaire" }
```

### 2. Permissions — `defaultPermissions.ts`
- Ajouter `"notifications"` et `"gestion_documentaire"` dans `AppModule`, `ALL_MODULES`, `MODULE_LABELS`
- Définir dans `DEFAULT_PERMISSIONS` : rmq = ALL_TRUE, autres rôles = NONE
- Cela les fait apparaître automatiquement dans la matrice AdminPermissions

### 3. Nouvelles routes — `App.tsx`
- `/admin/notifications` → page avec `NotificationConfigMatrix` (scope global) protégée par `RoleGuard requiredModule="notifications"`
- `/admin/documents-config` → page avec DocumentConfigTab (types, tags, permissions acteurs) protégée par `RoleGuard requiredModule="gestion_documentaire"`

### 4. Nouvelles pages
- `src/pages/AdminNotificationsConfig.tsx` : encapsule `NotificationConfigMatrix` avec mode read-only si `!hasPermission("notifications", "can_edit")`
- `src/pages/AdminDocumentsConfig.tsx` : encapsule le contenu DocumentConfigTab de SuperAdmin avec mode read-only si `!hasPermission("gestion_documentaire", "can_edit")`

### 5. SuperAdmin — `SuperAdmin.tsx`
Retirer les onglets "Notifications" et "Documents". Il ne reste que : Identité, Logos, Email/SMTP (3 onglets).

### 6. Mode lecture seule pour Admin
- Admin a `can_read` par défaut sur ces 2 modules mais pas `can_edit`
- Les pages affichent les données mais tous les boutons d'action et inputs sont `disabled` sans `can_edit`

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/lib/defaultPermissions.ts` | +2 modules |
| `src/pages/AdminNotificationsConfig.tsx` | Nouveau |
| `src/pages/AdminDocumentsConfig.tsx` | Nouveau |
| `src/pages/SuperAdmin.tsx` | Retirer 2 onglets |
| `src/components/AppSidebar.tsx` | +2 items dans adminItems |
| `src/App.tsx` | +2 routes admin |

