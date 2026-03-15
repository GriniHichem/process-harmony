

## Systeme de Notifications — Plan Final

### Inventaire complet des sources de notifications

Apres analyse, voici toutes les tables avec responsabilites et echeances :

```text
Tables avec responsable_id (FK acteurs)     Tables avec responsable (text = acteur_id)
─────────────────────────────────────────    ──────────────────────────────────────────
actions          (echeance)                  risk_actions       (deadline)
process_tasks    (pas d'echeance)            risk_moyens        (deadline)
processes        (pas d'echeance)            indicator_actions   (deadline)
quality_objectives (echeance)                indicator_moyens    (deadline)
review_decisions  (echeance)                 context_issue_actions (date_revue)

Resolution utilisateur : acteur_id → profiles.acteur_id → profiles.id (= user_id)
```

### Architecture

```text
┌──────────────────────────────────────────────────────┐
│              SOURCES DE NOTIFICATIONS                 │
│                                                       │
│  1. Triggers DB (INSERT/UPDATE sur 10 tables)         │
│     → Detecte assignation + changement statut         │
│     → Insere dans table notifications                 │
│                                                       │
│  2. Edge Function CRON (check-deadlines)              │
│     → Quotidien, scanne echeances J-N et retards      │
│     → Insere notifs push + appelle send-notif-email   │
└──────────┬───────────────────────┬────────────────────┘
           │                       │
           ▼                       ▼
┌─────────────────────┐  ┌─────────────────────────────┐
│  Table notifications │  │  Edge Function               │
│  + Realtime channel  │  │  send-notification-email     │
│                      │  │  (reutilise SMTP existant)   │
└──────────┬───────────┘  └─────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  UI                                      │
│  - NotificationBell (header, badge)      │
│  - Panneau dropdown (liste, marquer lu)  │
│  - Page /notifications (historique)      │
│  - Preferences (profil utilisateur)      │
│  - Config globale (Super Admin)          │
└──────────────────────────────────────────┘
```

---

### Etape 1 — Migration SQL

**Table `notifications`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL | Destinataire (ref profiles.id) |
| type | text NOT NULL | `assignation`, `echeance_proche`, `retard`, `statut_change` |
| title | text NOT NULL | Ex: "Nouvelle action assignee" |
| message | text | Detail |
| entity_type | text | `action`, `risk_action`, `process_task`, etc. |
| entity_id | uuid | Lien vers l'element |
| entity_url | text | Route frontend pour redirection |
| is_read | boolean DEFAULT false | |
| channel | text DEFAULT 'push' | `push`, `email`, `both` |
| created_at | timestamptz DEFAULT now() | |

RLS : SELECT/UPDATE/DELETE uniquement pour `user_id = auth.uid()`. INSERT via trigger (SECURITY DEFINER).

**Table `notification_preferences`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid UNIQUE NOT NULL | Ref profiles.id |
| assignation | text DEFAULT 'both' | `push`, `email`, `both`, `none` |
| echeance_proche | text DEFAULT 'push' | |
| retard | text DEFAULT 'both' | |
| statut_change | text DEFAULT 'push' | |
| rappel_jours | int DEFAULT 3 | Jours avant echeance |

RLS : chaque utilisateur lit/modifie ses propres preferences.

**Fonction DB `notify_responsibility_change()`** (SECURITY DEFINER)

Trigger generique appele sur INSERT/UPDATE des 10 tables. Logique :
1. Extraire le `responsable_id` ou `responsable` (acteur_id en text)
2. Resoudre vers `user_id` via `SELECT id FROM profiles WHERE acteur_id = ...`
3. Si assignation change (OLD vs NEW) → inserer notification type `assignation`
4. Si statut change → inserer notification type `statut_change`
5. Respecter les preferences utilisateur (table `notification_preferences`)

Triggers attaches a : `actions`, `process_tasks`, `risk_actions`, `risk_moyens`, `indicator_actions`, `indicator_moyens`, `context_issue_actions`, `quality_objectives`, `review_decisions`, `processes`.

**Activer Realtime** sur la table `notifications`.

---

### Etape 2 — Edge Functions

**`check-deadlines`** (appele par pg_cron quotidiennement)
- Scanne les 10 tables pour trouver les echeances a J-N (configurable) et les retards
- Evite les doublons (verifie si notif deja envoyee pour cette entite+type+date)
- Insere des notifications push
- Appelle `send-notification-email` pour les utilisateurs qui ont choisi `email` ou `both`

**`send-notification-email`** (HTTP interne)
- Recoit `{ user_id, title, message, entity_url }`
- Charge l'email du profil et les settings SMTP existants
- Envoie un email HTML professionnel avec lien direct
- Reutilise l'infrastructure SMTP deja en place

---

### Etape 3 — Composants UI

**`NotificationBell`** (dans AppLayout header)
- Icone cloche avec badge compteur (non lus)
- Popover/dropdown avec liste des 20 dernieres notifications
- Chaque item : icone type, titre, message tronque, date relative, indicateur lu/non lu
- Clic → navigation vers l'entite (`entity_url`) + marquer comme lu
- Bouton "Tout marquer comme lu"
- Lien vers "/notifications" pour l'historique complet
- Abonnement Realtime pour mise a jour instantanee

**Page `/notifications`**
- Liste complete paginee avec filtres (type, lu/non lu, date)
- Actions en masse (marquer lu, supprimer)

**`NotificationPreferences`** (section dans profil ou page dediee)
- Pour chaque type de notification : choix push/email/both/none
- Nombre de jours de rappel avant echeance

---

### Etape 4 — Configuration Super Admin

Ajouter une section "Notifications" dans SuperAdmin avec :
- Toggle global activer/desactiver les notifications email
- Delai de rappel par defaut (jours avant echeance)
- Cles `app_settings` : `notif_email_enabled` (true/false), `notif_rappel_jours_defaut` (3)

---

### Fichiers concernes

| Element | Fichier |
|---|---|
| Migration SQL | `supabase/migrations/` (tables, fonction, triggers, realtime, cron) |
| Edge Function cron | `supabase/functions/check-deadlines/index.ts` |
| Edge Function email | `supabase/functions/send-notification-email/index.ts` |
| Composant cloche | `src/components/NotificationBell.tsx` |
| Preferences | `src/components/NotificationPreferences.tsx` |
| Page historique | `src/pages/Notifications.tsx` |
| Header | `src/components/AppLayout.tsx` (ajout NotificationBell) |
| Super Admin | `src/pages/SuperAdmin.tsx` (section notifications) |
| Routes | `src/App.tsx` (route /notifications) |
| Sidebar | `src/components/AppSidebar.tsx` (lien optionnel) |

### Ordre d'implementation

1. Migration : tables + fonction + triggers + realtime
2. NotificationBell + popover + realtime subscription
3. Page /notifications + route
4. NotificationPreferences
5. Section Super Admin
6. Edge Function send-notification-email
7. Edge Function check-deadlines + cron pg_cron

