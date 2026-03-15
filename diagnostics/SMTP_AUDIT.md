# 📧 Audit SMTP — Q-Process

## Architecture SMTP

Le projet utilise un système SMTP custom (pas Supabase Auth emails). Les emails sont envoyés via la bibliothèque Deno `denomailer@1.6.0` depuis les Edge Functions.

---

## Stockage de la configuration SMTP

### Où sont stockées les valeurs ?

Toutes les valeurs sont dans la table `app_settings` (clé/valeur) :

| Clé | Description | Qui l'écrit |
|---|---|---|
| `smtp_host` | Hôte du serveur SMTP | Super Admin (UI frontend) |
| `smtp_port` | Port SMTP (587 ou 465) | Super Admin (UI frontend) |
| `smtp_user` | Nom d'utilisateur SMTP | Super Admin (UI frontend) |
| `smtp_password` | Mot de passe SMTP | Edge Function `admin-save-smtp-password` |
| `support_email` | Adresse expéditeur (From) | Super Admin (UI frontend) |
| `app_name` | Nom de l'application (défaut : "Q-Process") | Super Admin (UI frontend) |
| `app_url` | URL de l'application (pour les liens dans les emails) | Super Admin (UI frontend) |

### Pourquoi le mot de passe est séparé ?

Le mot de passe SMTP est écrit via l'Edge Function `admin-save-smtp-password` (qui utilise le `SUPABASE_SERVICE_ROLE_KEY`) pour éviter de l'exposer côté client. Les autres champs sont écrits directement par le frontend via le SDK Supabase.

---

## Fonctions qui lisent la configuration SMTP

| Fonction | Clés lues | Usage |
|---|---|---|
| `send-test-email` | smtp_host, smtp_port, smtp_user, smtp_password, support_email, app_name | Envoi email de test |
| `send-notification-email` | smtp_host, smtp_port, smtp_user, smtp_password, support_email, app_name, app_url | Envoi notification |
| `send-survey-copy` | smtp_host, smtp_port, smtp_user, smtp_password, support_email, app_name | Envoi copie sondage |

---

## Fonctions qui envoient réellement les emails

| Fonction | Destinataire | Sujet type |
|---|---|---|
| `send-test-email` | Adresse fournie par l'admin | "Test Email - Q-Process" |
| `send-notification-email` | Email du profil utilisateur (table `profiles`) | Titre de la notification |
| `send-survey-copy` | Email du répondant du sondage | "Copie de vos reponses - {nom sondage}" |

---

## Rôles exigés pour l'utilisation

| Fonction | Rôle requis | Vérification |
|---|---|---|
| `admin-save-smtp-password` | `super_admin` | Lecture `user_roles` côté service_role |
| `send-test-email` | `super_admin` | Lecture `user_roles` côté service_role |
| `send-notification-email` | Aucun (système) | Appelé par trigger DB ou cron |
| `send-survey-copy` | Aucun (public) | Pas de vérification d'auth |

---

## Flux d'envoi email

```
1. Super Admin configure SMTP via /super-admin
   ├── smtp_host, smtp_port, smtp_user → écrits directement dans app_settings (frontend)
   └── smtp_password → envoyé à Edge Function admin-save-smtp-password → upsert app_settings

2. Un événement déclenche une notification
   ├── Trigger notify_responsibility_change() → INSERT dans notifications
   ├── Trigger dispatch_notification_email() → appel HTTP via pg_net
   └── → send-notification-email → lit app_settings → denomailer → SMTP

3. Ou : check-deadlines (cron) scanne les échéances
   └── INSERT dans notifications → même flux trigger

4. Ou : Répondant soumet un sondage
   └── Frontend appelle send-survey-copy → lit app_settings → denomailer → SMTP
```

---

## Gestion du port 465 et TLS

### Code actuel (identique dans les 3 fonctions d'envoi)

```typescript
const client = new SMTPClient({
  connection: {
    hostname: cfg.smtp_host,
    port: smtpPort,
    tls: smtpPort === 465,  // TLS direct si port 465
    auth: { username: cfg.smtp_user, password: cfg.smtp_password },
  },
});
```

### Analyse

| Port | Protocole | `tls` dans le code | Comportement |
|---|---|---|---|
| 465 | SMTPS (TLS direct / implicit TLS) | `true` | ✅ Correct — connexion TLS dès l'ouverture |
| 587 | SMTP + STARTTLS | `false` | ⚠️ Dépend de denomailer — `tls: false` signifie "pas de TLS immédiat", mais denomailer peut faire STARTTLS automatiquement |
| 25 | SMTP plain | `false` | ⚠️ Non chiffré — déconseillé |

### Cohérence

- **Port 465** : ✅ Le code est cohérent — `tls: true` pour TLS direct
- **Port 587** : ⚠️ Partiellement cohérent — denomailer avec `tls: false` tente STARTTLS si le serveur le propose, mais ce n'est pas garanti. Pour forcer STARTTLS sur le port 587, il faudrait utiliser `tls: true` (selon la version de denomailer)

---

## Causes probables d'échec SMTP

### 1. Configuration incomplète
- `smtp_host`, `smtp_user` ou `smtp_password` manquant dans `app_settings`
- **Diagnostic** : Vérifier `SELECT * FROM app_settings WHERE key LIKE 'smtp%'`

### 2. Port bloqué par firewall
- Les ports 465 et 587 sont souvent bloqués sur les serveurs cloud (AWS, GCP, etc.)
- **Diagnostic** : `telnet smtp.example.com 465` depuis le serveur

### 3. Authentification SMTP refusée
- Mauvais identifiants
- Compte SMTP verrouillé
- Authentification à deux facteurs non compatible

### 4. TLS/SSL incompatible
- Certificat auto-signé sur le serveur SMTP
- Version TLS non supportée par Deno/denomailer

### 5. Variables d'environnement Edge Functions
- `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` manquantes
- → La fonction ne peut pas lire `app_settings`

### 6. Extension `pg_net` absente (self-hosted)
- Le trigger `dispatch_notification_email()` utilise `net.http_post()` de `pg_net`
- Si `pg_net` n'est pas installé, le dispatch email ne fonctionne pas
- Les emails ne seront PAS envoyés automatiquement via trigger

### 7. Clés `supabase_url` / `supabase_service_role_key` absentes de `app_settings`
- Le trigger `dispatch_notification_email()` lit ces valeurs depuis `app_settings`
- Elles sont auto-insérées par `check-deadlines` — si ce cron n'a jamais tourné, elles sont absentes
- **Solution** : Exécuter `check-deadlines` manuellement une première fois

### 8. Adresse From rejetée
- Le serveur SMTP n'autorise pas l'envoi depuis l'adresse `support_email`
- Vérifier que l'adresse est autorisée dans la configuration du serveur SMTP
