

## Plan : Fiabilisation email et portabilité hors Lovable

### Problèmes identifiés

1. **`send-notification-email` cassé** : appelle `get_smtp_password` (RPC inexistante). Le mot de passe SMTP est dans `app_settings.smtp_password`
2. **SMTP raw bugué** : `Object.assign(conn, tlsConn)` après STARTTLS ne fonctionne pas en Deno — `send-test-email` utilise `denomailer` et fonctionne
3. **Pas de dispatch email automatique** : quand une notification est insérée avec `channel = 'email'` ou `'both'`, aucun mécanisme ne déclenche l'envoi
4. **Triggers absents en base** : la configuration montre "no triggers" malgré les migrations — ils doivent être recréés de manière idempotente
5. **Templates génériques** : un seul template pour tous les types de notification

### Principes de portabilité (migration hors Lovable)

- **Zéro dépendance Vault** : mot de passe SMTP lu depuis `app_settings` (table portable)
- **Triggers idempotents** : `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` pour éviter les erreurs sur serveur vierge
- **Edge Functions autonomes** : utilisent uniquement `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (variables standard Supabase)
- **Librairie stable** : `denomailer` pour tous les envois SMTP (plus de raw socket)
- **Config centralisée** : tout dans `app_settings` (SMTP, app_url, app_name) — aucun secret externe requis

### Implémentation

**1. Réécriture `send-notification-email/index.ts`**
- Remplacer le SMTP raw par `denomailer` (même pattern que `send-test-email`)
- Lire `smtp_password` depuis `app_settings` (pas de RPC vault)
- Ajouter 4 templates HTML professionnels par type :
  - **Assignation** (bandeau bleu `#2563eb`) — "Vous avez été assigné(e) à..."
  - **Échéance proche** (bandeau orange `#f59e0b`) — "Rappel : échéance dans X jours"
  - **Retard** (bandeau rouge `#ef4444`) — "Action en retard de X jours"
  - **Changement de statut** (bandeau vert `#10b981`) — "Statut modifié : ancien → nouveau"
- Chaque template inclut : nom de l'app, lien d'action, pied de page, fallback texte

**2. Migration SQL — Triggers idempotents + dispatch email**
```sql
-- Recréer les 10 triggers de manière idempotente
DROP TRIGGER IF EXISTS notify_actions_change ON actions;
CREATE TRIGGER notify_actions_change AFTER INSERT OR UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION notify_responsibility_change();
-- (× 10 tables)

-- Trigger auto-dispatch email sur INSERT notifications
CREATE OR REPLACE FUNCTION dispatch_notification_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.channel IN ('email', 'both') THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'entity_url', NEW.entity_url,
        'notif_type', NEW.type
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispatch_email_on_notification ON notifications;
CREATE TRIGGER dispatch_email_on_notification AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION dispatch_notification_email();
```

> **Note portabilité** : `pg_net` (`net.http_post`) est pré-installé sur Supabase. Sur un serveur PostgreSQL classique, remplacer par un worker externe (cron job) qui lit les notifications non envoyées. Le plan inclut un flag `email_sent` sur la table `notifications` pour ce scénario.

**3. Ajout colonne `email_sent` sur `notifications`**
- `email_sent boolean DEFAULT false` — permet à un worker externe de traiter les emails en file d'attente si `pg_net` n'est pas disponible
- La fonction `dispatch_notification_email` met à jour ce flag après l'appel HTTP

**4. Correction `check-deadlines/index.ts`**
- Supprimer l'appel direct à `send-notification-email` (le trigger DB s'en charge maintenant)
- La fonction insère juste dans `notifications` avec le bon `channel` — le trigger dispatch automatiquement

**5. Mise à jour `send-test-email/index.ts`**
- Déjà fonctionnel, aucune modification nécessaire

### Fichiers impactés

| Fichier | Action |
|---|---|
| `supabase/functions/send-notification-email/index.ts` | Réécriture complète (denomailer + templates) |
| `supabase/functions/check-deadlines/index.ts` | Suppression appel email direct |
| Migration SQL | Triggers idempotents + dispatch + colonne `email_sent` |

### Templates email (aperçu)

```text
┌─────────────────────────────────────┐
│  ██████  Bandeau couleur par type   │
│  ┌───────────────────────────────┐  │
│  │  [Logo App]                   │  │
│  │                               │  │
│  │  Titre notification           │  │
│  │  ─────────────────────        │  │
│  │  Message détaillé avec        │  │
│  │  contexte de l'entité         │  │
│  │                               │  │
│  │  [ Voir dans Q-Process ]      │  │
│  │                               │  │
│  │  ─────────────────────        │  │
│  │  Envoyé par Q-Process         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

