## Objectif

Appliquer la logique « Acteur (fonction) → Utilisateur réel » (composant `ActeurUserSelect`) à **tout le module Plan d'action** (projets + actions legacy), exactement comme dans les modules Risques / Indicateurs / NC. Quand une fonction est portée par **un seul utilisateur** → sélection automatique. Sinon → menu pour préciser **la personne réelle**, ce qui permet à la notification (push + email SMTP) de cibler le bon individu.

## État actuel

- La table `public.actions` (legacy) **a déjà** la colonne `responsable_user_id` (migration 20260317122959).
- Les tables `project_actions` et `project_tasks` ont aussi déjà `responsable_user_id` et sont déjà couvertes par la trigger `notify_responsibility_change`.
- La trigger envoie déjà la notification au bon `user_id` quand il est précisé, sinon retombe sur le 1er profil lié à la fonction.
- Côté UI cependant, le module Actions **n'utilise pas** `ActeurUserSelect` : il utilise un `Select` simple basé uniquement sur `acteurs`, donc l'utilisateur réel n'est jamais transmis et la notification cible un profil arbitraire.

## Changements à faire

### 1. Page `src/pages/Actions.tsx` — création d'action legacy

- Ajouter `responsable_user_id` dans `LegacyAction` et dans le state `newLegacyAction`.
- Remplacer le `Select` du formulaire (ligne ~417) par `<ActeurUserSelect>` avec gestion des deux valeurs (acteurId + userId).
- À l'INSERT (ligne ~180), persister `responsable_user_id`.
- Affichage de la ligne action (ligne ~457) : si `responsable_user_id`, afficher « Fonction — Prénom Nom » ; sinon afficher seulement la fonction (comportement actuel).

### 2. `src/components/projects/ProjectActionsList.tsx` — actions de projet

- Modifier le composant interne `ResponsableSelector` (ligne ~575) pour utiliser `ActeurUserSelect` au lieu d'un `Select` simple.
  - Pour `responsable_id` (R1) : couplé à `responsable_user_id` (déjà en BDD).
  - Pour `responsable_id_2` et `responsable_id_3` : pas de champ user dédié en BDD → garder le sélecteur simple actuel (R2/R3 sont historiquement des co-responsables au niveau fonction, ne déclenchent pas de notification individuelle). À confirmer ; sinon ajouter colonnes `responsable_user_id_2/3` via migration.
- `updateAction` : quand on change `responsable_id`, réinitialiser `responsable_user_id = null` ; quand on change l'utilisateur, mettre à jour `responsable_user_id` seul.
- Sous-tâches (`project_tasks`, ligne ~1029) : remplacer aussi le `Select` simple par `ActeurUserSelect` compact (taille réduite). La table `project_tasks` a déjà `responsable_user_id`.

### 3. Affichages

- Quand `responsable_user_id` est renseigné, afficher « Fonction — Prénom Nom » (lookup léger via `profiles`) au lieu de la seule fonction. Ajouter un petit hook utilitaire `useProfilesById` (cache en mémoire) ou faire un fetch ciblé, pour éviter un N+1.

### 4. Notifications — aucune migration nécessaire

- La trigger `notify_responsibility_change` lit déjà `responsable_user_id` en priorité, puis tombe sur le premier profil lié à l'acteur. Donc dès que l'UI remplit ce champ, la notification (push + email via `dispatch_notification_email` → `send-notification-email`) cible automatiquement la bonne personne.
- Aucune modification de fonction edge ou de SQL n'est nécessaire.
- Vérifier seulement que la clause `resolve_notification_channel(_user_id, ...)` reçoit bien le user_id ciblé (déjà le cas).

## Récap technique

| Fichier | Changement |
|---|---|
| `src/pages/Actions.tsx` | Form création + état + insert + affichage utilisent `ActeurUserSelect` et `responsable_user_id` |
| `src/components/projects/ProjectActionsList.tsx` | `ResponsableSelector` (R1) → `ActeurUserSelect` ; sélecteur de tâche → `ActeurUserSelect` |
| (option) `src/hooks/useProfilesById.ts` | Petit hook de lookup pour afficher « Fonction — Prénom Nom » |
| BDD | Aucune migration |
| Edge functions | Aucune modification |

## Résultat attendu

- À la création/édition d'une action ou d'une tâche, l'utilisateur choisit la fonction. Si **1 seule** personne est rattachée → badge auto avec son nom. Si **plusieurs** → liste pour choisir précisément.
- Les notifications (cloche + email SMTP) arrivent à la **personne réelle** sélectionnée, pas à un profil arbitraire de la fonction.
- Cohérence visuelle et comportementale parfaite avec Risques, Indicateurs, NC, Enjeux.