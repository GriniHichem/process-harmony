

# Dashboard Global Indicateurs avec Export CSV historique

## Contexte

L'utilisateur veut un dashboard qui agrege tous les indicateurs de tous les processus auxquels il a acces (meme logique d'acces que la page Indicateurs existante), avec export CSV incluant l'historique des mesures, en format point-virgule et UTF-8 BOM pour Excel FR.

## Fichiers

### 1. Creer `src/pages/DashboardIndicateurs.tsx`

**Acces** : reprendre exactement la logique de `Indicateurs.tsx` lignes 52-111 :
- Admin/RMQ/consultant : tous les processus
- Responsable processus : ses processus (`responsable_id = user.id`)
- Acteur : processus ou il a des taches (`process_tasks.responsable_id = acteur_id`)
- Si un seul processus accessible, pre-selectionner automatiquement

**Donnees chargees** :
- `processes` (filtres par acces)
- `indicators` (filtres par process_id)
- `indicator_values` pour TOUS les indicateurs (historique complet, `order by date_mesure asc`)

**KPI Cards (4)** :
- Total indicateurs
- En alerte (derniere valeur < seuil_alerte)
- A l'objectif (derniere valeur >= cible)
- Sans mesure

**Filtre** : Select processus ou "Tous"

**Tableau** : Processus | Indicateur | Type | Unite | Cible | Seuil | Frequence | Derniere valeur | Date derniere mesure | Statut (badge couleur)

**Export CSV** : bouton "Exporter CSV" qui genere un fichier avec :
- BOM UTF-8 (`\uFEFF`)
- Separateur `;`
- Une ligne par mesure historique (pas par indicateur)
- Colonnes : `Processus;Indicateur;Type;Unité;Cible;Seuil d'alerte;Fréquence;Formule;Date mesure;Valeur;Commentaire`
- Indicateurs sans mesure : une ligne avec colonnes date/valeur/commentaire vides
- Guillemets autour des valeurs texte (echapper les `"` internes)
- Nom fichier : `indicateurs_historique_YYYY-MM-DD.csv`

### 2. Modifier `src/App.tsx`
- Ajouter `const DashboardIndicateurs = lazy(() => import("./pages/DashboardIndicateurs"));`
- Ajouter route `/dashboard-indicateurs` avec `RoleGuard requiredModule="indicateurs"`

### 3. Modifier `src/components/AppSidebar.tsx`
- Ajouter dans `qualityItems` en premiere position :
  `{ title: "Dashboard Indicateurs", url: "/dashboard-indicateurs", icon: TrendingUp, module: "indicateurs" }`
- Ajouter `TrendingUp` dans les imports lucide

