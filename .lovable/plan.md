

# Refonte UI — Navigation par Navbar + Page Modules style Odoo

## Vue d'ensemble

Supprimer la sidebar latérale, la remplacer par une navbar horizontale en haut, et créer une page "Modules" avec des blocs/cartes visuelles organisés par catégorie. Chaque page interne garde la navbar en haut sans sidebar.

## Architecture de navigation

```text
┌─────────────────────────────────────────────────────────────┐
│  NAVBAR (sticky top)                                        │
│  [Logo] [Accueil] [Modules ▼] [Notifications] [Paramètres] │
│                                    [Search] [Profile ▼]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    PAGE CONTENT                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1 — Navbar horizontale (`AppNavbar.tsx`)

Nouveau composant remplaçant `AppSidebar` + `SidebarProvider` :

- **Logo + App name** à gauche
- **Liens principaux** : Accueil, Modules (lien vers `/modules`)
- **Dropdown "Modules"** au hover/click : groupes (Processus, Manager, Pilotage SMQ, Audit, Administration) avec sous-liens filtrés par permissions
- **Actions droite** : GlobalSearch, NotificationBell, HeaderHelpButton, DarkModeToggle, AccessibilityToggle, profil dropdown (nom, rôle, mot de passe, déconnexion)
- **Mobile** : hamburger menu avec sheet/drawer
- Style : `bg-card/95 backdrop-blur-lg border-b shadow-md`, hauteur ~56px

## Phase 2 — Page Modules (`/modules`)

Nouvelle page `src/pages/Modules.tsx` :

- Grille de **blocs modules** groupés par catégorie
- Chaque catégorie = titre section avec icône
- Chaque bloc module :
  - Icône (grande, colorée dans un cercle gradient)
  - Nom du module
  - Description courte (1 ligne)
  - Hover : `scale(1.02)`, ombre portée, bordure primary subtile
  - Click : `navigate(url)`
- Filtré par `hasPermission(module, "can_read")`
- Responsive : 4 colonnes desktop, 3 tablette, 2 mobile

**Groupes de modules** (réutilisant les mêmes données que la sidebar actuelle) :
- Principal : Dashboard, Acteurs, Évaluation processus
- Processus : Processus, Cartographie, BPMN, Gestion documentaire
- Manager processus : Dashboard Indicateurs, Indicateurs, Risques, Incidents, Enjeux
- Pilotage SMQ : Politique qualité, Revue processus, Revue direction, Compétences, Satisfaction, Fournisseurs
- Audit & Amélioration : Dashboard Audit, Audits, NC, Actions, Journal
- Administration : Utilisateurs, Groupes, Permissions, Config notifications, Config documents

## Phase 3 — Refactoring `AppLayout.tsx`

- Retirer `SidebarProvider`, `AppSidebar`, `SidebarTrigger`
- Remplacer par `<AppNavbar />` en haut
- Layout simplifié : `<div className="min-h-screen flex flex-col"> <AppNavbar /> <main className="flex-1 p-6">{children}</main> </div>`

## Phase 4 — Route `/modules`

Dans `App.tsx` :
- Ajouter route `/modules` → `<Modules />`
- Le Dashboard (`/`) reste tel quel comme page d'accueil avec KPIs

## Phase 5 — Nettoyage

- Retirer `AppSidebar.tsx` (ou le garder inutilisé pour rollback)
- Retirer les imports sidebar dans `AppLayout.tsx`
- CSS : pas de changement majeur, les variables existantes et le design system sont conservés

## Détails techniques

### `AppNavbar.tsx` — Structure
```typescript
// Navbar items reprennent exactement les mêmes groupes que AppSidebar
// Dropdown "Modules" via Popover ou NavigationMenu de shadcn
// Profile dropdown via DropdownMenu
// Mobile : Sheet avec menu accordéon
```

### Bloc module — Style
```typescript
<div className="group relative bg-card border border-border/50 rounded-xl p-6 
  cursor-pointer transition-all duration-200 
  hover:shadow-lg hover:border-primary/30 hover:scale-[1.02]">
  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 
    flex items-center justify-center mb-4 group-hover:from-primary/20 group-hover:to-accent/20">
    <Icon className="h-6 w-6 text-primary" />
  </div>
  <h3 className="font-semibold text-foreground">{title}</h3>
  <p className="text-sm text-muted-foreground mt-1">{description}</p>
</div>
```

## Fichiers

| Fichier | Action |
|---|---|
| `src/components/AppNavbar.tsx` | **Nouveau** — navbar horizontale |
| `src/pages/Modules.tsx` | **Nouveau** — page modules en blocs |
| `src/components/AppLayout.tsx` | Refactoré — navbar au lieu de sidebar |
| `src/App.tsx` | +1 route `/modules` |
| `src/components/AppSidebar.tsx` | Plus utilisé (conservé pour rollback) |

## Contraintes respectées

- Pas de sidebar latérale
- Design system existant conservé (CSS variables, glass-card, etc.)
- Permissions respectées sur chaque bloc module
- Responsive desktop + tablette
- Navigation professionnelle ERP-style

