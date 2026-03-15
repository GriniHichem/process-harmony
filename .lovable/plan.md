

## Configuration avancée des notifications par entité

### Situation actuelle
- 4 types de notification globaux : assignation, échéance proche, retard, changement de statut
- Configuration utilisateur : 1 canal (push/email/both/none) par type — pas de granularité par entité
- Super Admin : toggle email global + délai rappel — informatif seulement

### Objectif
Permettre au Super Admin de configurer **par entité × par type** le canal de notification par défaut, et permettre à chaque utilisateur de surcharger ces défauts pour ses propres préférences.

### Architecture proposée

```text
Matrice de configuration : 10 entités × 4 types = 40 combinaisons

                  Assignation   Échéance    Retard    Statut
Actions           push+email    push        both      push
Risk Actions      push          email       both      none
Risk Moyens       push          push        both      none
Indicator Actions push          push        both      push
Indicator Moyens  push          push        both      none
Context Issues    push          push        both      push
Process Tasks     push          —           —         push
Processes         push          —           —         push
Quality Obj.      push+email    push        both      push
Review Decisions  push+email    push        both      push
```

### Plan technique

**1. Nouvelle table `notification_config`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| scope | text NOT NULL | `global` ou user_id |
| entity_type | text NOT NULL | `actions`, `risk_actions`, etc. |
| notif_type | text NOT NULL | `assignation`, `echeance_proche`, `retard`, `statut_change` |
| channel | text NOT NULL DEFAULT 'both' | `push`, `email`, `both`, `none` |
| created_at / updated_at | timestamptz | |

- Contrainte UNIQUE sur `(scope, entity_type, notif_type)`
- RLS : `scope = 'global'` lisible par tous, modifiable par admin/super_admin ; `scope = auth.uid()` modifiable par l'utilisateur
- L'ancienne table `notification_preferences` reste pour `rappel_jours` uniquement

**2. Super Admin — Matrice de configuration**

Remplacer la section informative actuelle par une **grille interactive** :
- Lignes : les 10 entités (groupées par catégorie)
- Colonnes : les 4 types de notification
- Cellules : Select dropdown (Push / Email / Both / Désactivé)
- Scope = `global` (défauts pour tous les utilisateurs)
- Bouton "Enregistrer tout" en bas

**3. Préférences utilisateur — Surcharge personnelle**

Enrichir `NotificationPreferences` avec la même matrice mais en scope utilisateur :
- Afficher les défauts globaux en grisé/placeholder
- L'utilisateur peut surcharger par entité ou laisser "Par défaut (global)"
- Option 5e choix : `default` = hériter du global

**4. Logique de résolution dans les triggers et edge functions**

```text
1. Chercher notification_config WHERE scope = user_id AND entity_type AND notif_type
2. Si pas trouvé → chercher WHERE scope = 'global' AND entity_type AND notif_type
3. Si pas trouvé → fallback 'both'
```

Modifier `notify_responsibility_change()` et `check-deadlines` pour utiliser cette résolution.

### Entités et labels

| entity_type | Label FR | Catégorie |
|---|---|---|
| actions | Actions correctives | Actions |
| quality_objectives | Objectifs qualité | Stratégie |
| review_decisions | Décisions de revue | Stratégie |
| risk_actions | Actions risques | Risques |
| risk_moyens | Moyens risques | Risques |
| indicator_actions | Actions indicateurs | Indicateurs |
| indicator_moyens | Moyens indicateurs | Indicateurs |
| context_issue_actions | Actions enjeux | Contexte |
| process_tasks | Tâches processus | Processus |
| processes | Processus | Processus |

### Fichiers impactés

| Fichier | Modification |
|---|---|
| Migration SQL | Table `notification_config` + seed défauts globaux |
| `src/pages/SuperAdmin.tsx` | Matrice interactive dans l'onglet Notifications |
| `src/components/NotificationPreferences.tsx` | Matrice utilisateur avec surcharge |
| `supabase/functions/check-deadlines/index.ts` | Résolution config par entité |
| Trigger `notify_responsibility_change()` | Résolution config par entité |

### Ordre d'implémentation
1. Migration : table `notification_config` + RLS + seed global defaults
2. Super Admin : matrice de configuration globale
3. Préférences utilisateur : matrice avec surcharge
4. Mise à jour trigger + edge function pour résolution granulaire

