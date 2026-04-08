

# Ajouter Responsable aux Activités + Attentes aux Parties prenantes

## Problème actuel

La table `process_elements` n'a que `code`, `description`, `ordre`, `type`, `process_id`. Pas de champ responsable ni de gestion des attentes.

## Modifications base de données

### Migration 1 : Colonne `responsable_id` sur `process_elements`
```sql
ALTER TABLE process_elements ADD COLUMN responsable_id uuid REFERENCES acteurs(id) ON DELETE SET NULL;
```
Utilisé uniquement pour les éléments de type `activite`.

### Migration 2 : Table `process_element_attentes`
```sql
CREATE TABLE process_element_attentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id uuid NOT NULL REFERENCES process_elements(id) ON DELETE CASCADE,
  description text NOT NULL,
  date_prevue date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE process_element_attentes ENABLE ROW LEVEL SECURITY;
-- RLS : authenticated can all
CREATE POLICY "Authenticated full access" ON process_element_attentes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```
Chaque partie prenante (process_element de type `partie_prenante`) peut avoir N attentes avec date prévue.

## Modifications UI

### 1. `ProcessElementList.tsx` — Afficher le responsable pour les activités
- Ajouter une prop optionnelle `showResponsable?: boolean` + `acteurs` + `onUpdateResponsable`
- Quand `showResponsable=true`, afficher un petit sélecteur d'acteur inline à droite de chaque élément (icône User + nom de fonction)
- En mode lecture : badge avec nom de l'acteur
- En mode édition : Select compact inline

### 2. Nouveau composant `ProcessElementAttentes.tsx` — Attentes par partie prenante
- Affiché sous chaque partie prenante dans la liste
- UI : bouton "+" pour ajouter une attente (description + date)
- Liste des attentes en sous-items avec date en badge
- Chaque attente a un bouton supprimer (hover)
- Design compact : attentes en lignes indentées sous la PP, avec calendrier pour la date

### 3. `ProcessDetail.tsx` — Intégration
- Pour la section `activite` : passer `showResponsable={true}` + acteurs au `ProcessElementList`
- Pour la section `partie_prenante` : remplacer le rendu simple par un composant enrichi qui combine la liste d'éléments + les attentes par élément
- Utiliser `useActeurs()` pour charger les acteurs

### 4. Design UX

```text
┌─ Activités principales (6) ─────────────────────┐
│ AP-001  Réceptionner la demande    [Help Desk ▼] │
│ AP-002  Analyser l'incident        [RSI ▼]       │
│ AP-003  Résoudre                   [Non assigné▼] │
└──────────────────────────────────────────────────┘

┌─ Parties prenantes (3) ──────────────────────────┐
│ PP-001  Direction Générale                        │
│   ├ Attente: Reporting mensuel         📅 15/06  │
│   ├ Attente: Conformité réglementaire  📅 30/09  │
│   └ [+ Ajouter une attente]                      │
│ PP-002  Clients internes                          │
│   ├ Attente: Temps de réponse < 4h     📅 01/07  │
│   └ [+ Ajouter une attente]                      │
└──────────────────────────────────────────────────┘
```

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Ajouter `responsable_id` + table `process_element_attentes` |
| `src/components/ProcessElementList.tsx` | Ajouter support responsable inline |
| `src/components/ProcessElementAttentes.tsx` | Nouveau — gestion attentes par PP |
| `src/pages/ProcessDetail.tsx` | Intégrer les deux enrichissements |

