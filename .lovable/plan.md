

# Liaison des actions de projet aux entités du SMQ

## Vue d'ensemble

Créer une table de liaison `project_action_links` qui permet de connecter une action de projet à des entités existantes : indicateurs, risques/opportunités, enjeux de contexte, non-conformités. La liaison est en lecture seule dans les entités cibles (on voit le projet + action liée). Dans l'action, on peut ajouter/supprimer des liens.

## Migration SQL

```sql
CREATE TABLE IF NOT EXISTS project_action_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES project_actions(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('indicator', 'risk', 'context_issue', 'nonconformity')),
  entity_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(action_id, entity_type, entity_id)
);

ALTER TABLE project_action_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage project_action_links"
  ON project_action_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

## Nouveau composant — `ProjectActionLinks.tsx`

Composant dédié affiché dans chaque carte d'action (section collapsible) :

**Fonctionnalités :**
- Affiche les liens existants sous forme de badges colorés par type (icone + label de l'entité)
- Bouton "Lier une entité" ouvre un Dialog avec :
  - Select du type d'entité (Indicateur, Risque, Opportunité, Enjeu, Non-conformité)
  - Select de l'entité (chargé dynamiquement depuis la table correspondante)
  - Bouton confirmer
- Suppression d'un lien via bouton X sur le badge
- En lecture seule si `!canEdit` ou action figée

**Couleurs par type :**
- Indicateur : bleu
- Risque : rouge
- Opportunité : vert
- Enjeu : violet
- Non-conformité : orange

**Données chargées :**
- `indicators` → `nom`
- `risks_opportunities` → `description` + `type` (pour distinguer risque/opportunité)
- `context_issues` → `intitule`
- `nonconformities` → `reference` + `description`

## Affichage côté entités cibles (lecture seule)

Dans les pages Indicateurs, Risques, Enjeux, NC — ajouter un petit encart "Lié au projet" quand un lien existe :
- Badge avec icone projet + titre du projet + titre de l'action
- Lien cliquable vers `/actions/{projectId}`

Composant réutilisable `LinkedProjectBadge.tsx` qui prend `entityType` + `entityId` et affiche les liens trouvés.

## Intégration dans `ProjectActionsList.tsx`

- Ajouter un bouton icone `Link` dans la barre d'outils de chaque action
- Section collapsible dans la carte d'action montrant `<ProjectActionLinks actionId={action.id} canEdit={canEdit && action.statut !== "terminee"} />`

## Fichiers créés/modifiés

| Fichier | Action |
|---|---|
| Migration SQL | Table `project_action_links` |
| `src/components/projects/ProjectActionLinks.tsx` | Nouveau — gestion des liens |
| `src/components/projects/LinkedProjectBadge.tsx` | Nouveau — badge lecture seule |
| `src/components/projects/ProjectActionsList.tsx` | Intégrer le composant liens |
| `src/pages/Indicateurs.tsx` | Ajouter `LinkedProjectBadge` |
| `src/pages/Risques.tsx` | Ajouter `LinkedProjectBadge` |
| `src/pages/EnjeuContexte.tsx` / `ContextIssuesManager.tsx` | Ajouter `LinkedProjectBadge` |
| `src/pages/NonConformites.tsx` | Ajouter `LinkedProjectBadge` |

