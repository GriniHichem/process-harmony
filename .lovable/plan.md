# Refonte design & UX des Plans d'action

Objectif : moderniser le module sans toucher à la logique métier (calculs d'avancement, permissions, RLS, workflows). Apporter plus de hiérarchie visuelle, de respiration, de cohérence et d'indices d'état.

## 1. Page Liste des projets (`src/pages/Actions.tsx`)

### Header de page
- Titre plus aéré avec sous-titre, séparateur subtil et un compteur visuel : "12 projets · 8 en cours · 3 en retard"
- 3 mini-KPI cards en haut (Total / En cours / En retard) avec icônes et couleurs sémantiques
- Bouton "Nouveau projet" mis en avant (variant primary, icône + ombre douce)

### Barre de filtres
- Ligne de filtres élégante : recherche texte (nouvelle), filtre statut (existant), tri (nouveau : récents / échéance / avancement), toggle vue **Grille / Liste compacte**
- Compteur de résultats à droite ("8 résultats")

### Grille de projets
- Espacement augmenté (gap 5 → respire), cartes plus harmonieuses
- Empty state illustré (icône large + message + CTA)

## 2. Carte Projet (`src/components/projects/ProjectCard.tsx`)

- Bandeau image plus haut (h-36) avec **dégradé en bas** pour lisibilité du titre si on superpose, sinon image + zone texte
- Si pas d'image : header coloré dégradé selon statut (gradient subtil)
- Badge statut avec **point coloré** (●) au lieu de fond plein, plus discret
- Ligne meta : icônes alignées avec compteurs (actions, échéance, responsable avatar)
- Barre de progression repensée : 
  - h-1.5, fond plus clair
  - Couleur dynamique : vert ≥80%, ambre 40-79%, rouge <40% si en retard
  - Pourcentage en grand à droite (text-base font-semibold)
- Hover : élévation douce + légère translation Y (-2px) au lieu du scale
- Indicateur "en retard" en coin (badge rouge discret) si échéance dépassée
- Indicateur cadenas si privé

## 3. Page Détail Projet (`src/pages/ProjectDetail.tsx`)

### Header
- Hero avec image en background + overlay dégradé (text blanc lisible) si image
- Sans image : header bleu dégradé subtil (var primary → background)
- Titre XL + slogan + chips meta (statut, privé, responsable avec avatar)
- Bloc "métriques" sous le titre : 3 chiffres clés (Avancement / Actions / Jours restants) façon stat-cards horizontales

### Barre de progression
- Plus large (max-w-xl), h-3, label "Avancement global" au-dessus
- Texte d'aide : "X actions sur Y terminées"

### Tabs
- Tabs avec icônes (Vue d'ensemble, Actions & Tâches, Planning)
- Underline style au lieu du fond plein, plus moderne

### Vue d'ensemble
- Layout 2 colonnes mieux équilibré
- Cards avec headers colorés discrets et icônes dans pastilles rondes
- Section "Acteurs impliqués" avec avatars empilés (stack) au lieu de simples badges

## 4. Liste Actions & Tâches (`src/components/projects/ProjectActionsList.tsx`)

- Carte d'action : 
  - Bordure gauche colorée selon statut (4px, signal visuel fort)
  - Header compact : titre + statut pill + responsables (avatars empilés) + menu actions à droite
  - Mini barre d'avancement intégrée dans la carte
  - Badge "En retard" rouge si échéance dépassée
  - Icône chevron animée à l'expansion
- Tâches enfants : indentation visuelle avec ligne verticale guide (border-left dashed)
- Action "Ajouter une tâche" en bouton ghost avec icône + à la fin de la liste des tâches
- Toolbar de filtre/tri en haut : Statut, Responsable, "Mes actions uniquement"
- Empty state amélioré

## 5. Planning Gantt (`src/components/projects/ProjectGanttChart.tsx`)

- Légende des statuts avec pastilles colorées plus visibles
- Lignes d'aujourd'hui (today line) en pointillés rouges discrets
- Hover sur barre : tooltip riche (titre, dates, %, responsable)
- Zebra-striping plus subtil sur les lignes
- En-tête sticky avec ombre quand scroll

## 6. Cohérence globale

- Utilisation systématique des tokens du design system (`--shadow-sm/md/lg`, couleurs sémantiques)
- Animations légères : `animate-in fade-in-0 slide-in-from-bottom-1` sur les cartes au mount
- Tous les états vides avec même pattern (icône large muted + titre + description + CTA optionnel)
- Avatars : composant réutilisable `<UserAvatarStack users={[]} max={3} />` pour responsables multiples

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/pages/Actions.tsx` | KPI header, recherche, tri, vue grille/liste, empty state |
| `src/components/projects/ProjectCard.tsx` | Refonte visuelle carte (bandeau, progress, hover, badges) |
| `src/pages/ProjectDetail.tsx` | Hero header, stats, tabs avec icônes, layout overview |
| `src/components/projects/ProjectActionsList.tsx` | Bordure statut, avatars, mini progress, toolbar filtres |
| `src/components/projects/ProjectGanttChart.tsx` | Légende, today line, tooltip riche |
| `src/components/projects/UserAvatarStack.tsx` (nouveau) | Composant avatars empilés réutilisable |

## Ce qui n'est PAS touché
- Logique d'avancement (`src/lib/projectProgress.ts`)
- Permissions, RLS, AuthContext
- Schéma DB, migrations
- Workflows commentaires privés / collaborateurs
- Logique de création/édition (ProjectForm)

## Résultat attendu
Module Plans d'action visuellement aligné avec le reste du SMQ, plus respirant, avec une hiérarchie claire et des indices d'état immédiats (couleurs, avatars, retards). Aucune régression fonctionnelle.
