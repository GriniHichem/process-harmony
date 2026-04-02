

# Journal d'activité — Version avancée

## Vue d'ensemble

Transformer le journal d'activité actuel (500 logs max, filtres basiques, liste de cards) en un module professionnel avec pagination serveur, filtres combinés performants, statistiques, export, et vue tabulaire dense.

## Problèmes actuels

- Limite fixe à 500 lignes, pas de pagination
- Filtrage 100% côté client → lent avec beaucoup de données
- Pas de filtre par utilisateur
- Pas de statistiques / résumé
- Pas d'export
- Affichage en cards peu dense → difficile à scanner

## Améliorations prévues

### 1. Pagination serveur-side
- Requêtes Supabase paginées (50 par page) avec `.range(from, to)`
- Filtres appliqués côté serveur via `.eq()`, `.gte()`, `.lte()`, `.ilike()`
- Compteur total via `.select('*', { count: 'exact', head: true })`

### 2. Filtres avancés
- **Recherche texte** : recherche dans `new_value`, `old_value` côté serveur (textSearch ou ilike sur champs JSON)
- **Type d'entité** : multi-select (pouvoir filtrer plusieurs entités)
- **Action** : create / update / delete
- **Utilisateur** : dropdown avec tous les profils
- **Période** : date début + date fin (existant, conservé)
- **Bouton "Réinitialiser"** pour vider tous les filtres
- Les filtres déclenchent un rechargement serveur (debounce 300ms pour la recherche texte)

### 3. Vue tabulaire
- Remplacer les cards par un `Table` dense avec colonnes : Date/heure, Utilisateur, Action, Entité, Nom, Détails modifiés
- Lignes colorées selon l'action (vert création, bleu modif, rouge suppression)
- Ligne cliquable → expand inline montrant old_value vs new_value (diff visuel)
- Toggle vue cards / vue table

### 4. Statistiques en-tête
- 4 mini-cards KPI en haut : Total logs, Créations, Modifications, Suppressions (pour la période filtrée)
- Mini bar chart des 7 derniers jours d'activité (optionnel, via Recharts)

### 5. Export
- Bouton "Exporter CSV" qui exporte les résultats filtrés actuels
- Colonnes : date, utilisateur, action, entité, nom, résumé des changements

### 6. Tables supplémentaires à tracer
Ajouter des triggers `log_audit_event()` sur les tables manquantes :
- `indicators_values`, `context_issues`, `suppliers`, `formations`, `competences`, `client_surveys`, `quality_objectives`, `management_reviews`, `profiles`, `user_roles`

## Structure technique

### Migration SQL
- Créer triggers audit sur ~10 tables manquantes
- Ajouter index `idx_audit_logs_created_at` pour la pagination ordonnée
- Ajouter index GIN sur `new_value` pour la recherche JSON (optionnel, performance)

### Fichier modifié : `src/pages/Journal.tsx`
- Refactoring complet :
  - Hook `useJournalData` interne gérant pagination, filtres serveur, debounce
  - Vue table avec expand row
  - Stats KPI cards
  - Export CSV
  - Filtre utilisateur
  - Toggle vue cards/table

### Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Triggers audit sur tables manquantes + index |
| `src/pages/Journal.tsx` | Refactoring complet — pagination serveur, table, stats, export, filtres avancés |

