

## Plan : Emails enrichis avec détails de l'entité

### Problème actuel
Les emails contiennent uniquement un titre générique et un message court. Aucune information contextuelle : pas de nom d'entité, pas de dates, pas de description complète.

### Solution
Passer `entity_type` et `entity_id` à la fonction d'envoi email, puis requêter la table source pour récupérer les détails complets et les afficher dans un template HTML structuré par type d'entité.

### Données affichées par entité

| Entité | Champs affichés dans l'email |
|---|---|
| actions | description, type_action, statut, échéance, source_type |
| quality_objectives | description, statut, échéance |
| review_decisions | description, statut, échéance |
| risk_actions | description, statut, deadline |
| risk_moyens | description, statut, deadline |
| indicator_actions | description, statut, deadline |
| indicator_moyens | description, statut, deadline |
| context_issue_actions | description, statut, date_revue |
| process_tasks | nom, statut |
| processes | nom, type_processus, statut |

### Modifications techniques

**1. Trigger `dispatch_notification_email()` — ajouter entity_type + entity_id**

Ajouter `entity_type` et `entity_id` au payload JSON envoyé via `pg_net` :
```sql
body := jsonb_build_object(
  ...existants...,
  'entity_type', COALESCE(NEW.entity_type, ''),
  'entity_id', COALESCE(NEW.entity_id::text, '')
)
```

**2. Edge Function `send-notification-email` — requête entité + templates enrichis**

- Accepter `entity_type` et `entity_id` dans le payload
- Si présents, requêter la table correspondante pour récupérer les champs utiles
- Mapper chaque entity_type vers un label FR et ses colonnes pertinentes
- Générer un bloc HTML "Détails" avec tableau clé/valeur :
  - Entité : label FR (ex: "Action corrective")
  - Description : texte complet
  - Statut : valeur formatée
  - Échéance / Deadline / Date revue : date formatée FR
  - Source / Type : selon l'entité

Template enrichi (section ajoutée entre le message et le bouton CTA) :
```text
┌────────────────────────────────┐
│  Bandeau couleur               │
├────────────────────────────────┤
│  Titre notification            │
│  ┌──────────────────────────┐  │
│  │ Message contextuel       │  │
│  └──────────────────────────┘  │
│                                │
│  ── Détails de l'élément ──    │
│  Entité : Action corrective    │
│  Description : Mettre à jour...│
│  Statut : En cours             │
│  Échéance : 20/03/2026         │
│                                │
│  [ Voir dans Q-Process ]       │
├────────────────────────────────┤
│  Envoyé automatiquement        │
└────────────────────────────────┘
```

### Fichiers impactés

| Fichier | Modification |
|---|---|
| Migration SQL | Mettre à jour `dispatch_notification_email()` pour passer `entity_type` + `entity_id` |
| `supabase/functions/send-notification-email/index.ts` | Ajouter lookup entité + bloc HTML détails par type |

### Ordre d'exécution
1. Migration SQL : mise à jour du trigger dispatch
2. Réécriture de l'edge function avec lookup + templates enrichis

