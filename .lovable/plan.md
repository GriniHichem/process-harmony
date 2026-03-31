

# Dashboard Principal Avancé — KPIs Complets

## Vue d'ensemble

Transformer le dashboard actuel (7 KPI cards + 2 charts) en un tableau de bord complet couvrant tous les modules de l'application, avec les projets/plans d'action en vedette.

## Nouveaux KPIs à ajouter

### Projets / Plans d'action (nouveau)
- **Projets actifs** : count `projects` avec statut `en_cours`
- **Actions de projet en retard** : `project_actions` avec `echeance < now()` et statut != `terminee`
- **Avancement moyen** : moyenne `avancement` des `project_actions` en cours
- **Tâches de projet en retard** : `project_tasks` avec `echeance < now()` et statut != `terminee`

### Modules existants non encore affichés
- **Documents** : total `documents` (non archivés)
- **Fournisseurs** : total `suppliers`
- **Objectifs qualité** : total `quality_objectives`
- **Enjeux contexte** : total `context_issues`
- **Formations** : total `formations`
- **Compétences évaluées** : total `competences`
- **Satisfaction client** : total `client_surveys` publiées
- **Revues de direction** : total `management_reviews`

## Nouvelle structure du Dashboard

### Section 1 — KPI Cards (grille 4 colonnes)
Toutes les cards existantes + nouvelles cards projets et modules. Chaque card reste cliquable vers son module.

### Section 2 — Projets / Plans d'action (nouveau bloc)
- **Card large** avec mini-tableau des projets en cours : titre, nb actions, avancement (Progress bar), nb actions en retard
- **Donut chart** : répartition des statuts de projet (en_cours, termine, suspendu)

### Section 3 — Charts existants (améliorés)
- Pie chart processus (inchangé)
- Bar chart synthèse qualité (ajout projets en retard, documents)

### Section 4 — Vue rapide complémentaire (nouveau)
- Mini-cards ou tableau compact pour : Documents, Fournisseurs, Objectifs, Formations, Satisfaction, Revues

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/hooks/useDashboardStats.ts` | Ajouter toutes les nouvelles requêtes Supabase (projects, project_actions, project_tasks, documents, suppliers, quality_objectives, context_issues, formations, competences, client_surveys, management_reviews) |
| `src/pages/Dashboard.tsx` | Restructurer avec sections KPI, projets, charts, modules complémentaires. Ajouter RadialBarChart ou donut pour statuts projets |

## Détails techniques

- Toutes les requêtes additionnelles dans le `Promise.all` existant du hook
- Interface `DashboardStats` étendue avec ~15 nouveaux champs
- Recharts : ajout `RadialBarChart` pour avancement projets, `PieChart` pour statuts projets
- Cards projets avec `Progress` component pour avancement visuel
- Responsive : sections en grille adaptative

