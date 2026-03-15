

## Analyse du probleme spam + portabilite

### Pourquoi les emails arrivent en spam

Le probleme vient du fait que les emails sont envoyes via SMTP avec un `from` qui ne correspond pas forcement au domaine du serveur SMTP, et surtout il manque les headers email professionnels essentiels:
- **Pas de Message-ID** conforme (RFC 5322)
- **Pas de List-Unsubscribe** header
- **Pas de DKIM/SPF alignment** (cote serveur mail, pas cote code -- mais on peut aider)
- **Emojis dans le Subject** (les filtres anti-spam penalisent les emojis comme `📋`)
- **Pas de text/plain fallback** propre

### Ce que je peux corriger cote code

1. **Supprimer les emojis des sujets** -- les filtres spam (Outlook, Gmail) penalisent fortement
2. **Ajouter des headers SMTP professionnels** (`Message-ID`, `X-Mailer`, `Reply-To`)
3. **Assurer que le `from` utilise le format "Nom <email>"** au lieu d'un email brut
4. **Ameliorer le ratio HTML/texte** -- ajouter un vrai contenu text/plain

### Portabilite / migration serveur

Le systeme actuel stocke deja toute la config SMTP en base (`app_settings`). C'est une bonne base. Pour garantir zero erreur lors d'une migration:

1. **Ajouter `verify_jwt = false` dans config.toml** pour les edge functions qui doivent fonctionner sans JWT (comme `send-survey-copy` appele par des anonymes)
2. **Verifier que `send-survey-copy` n'exige pas d'auth** (c'est deja le cas -- OK)
3. **Documenter dans le Super Admin** un bouton "Tester la connexion SMTP" -- deja present, OK

### Plan de modifications

**Fichiers a modifier:**

| Fichier | Modification |
|---|---|
| `supabase/functions/send-survey-copy/index.ts` | Supprimer emoji sujet, ajouter headers pro (`Message-ID`, `Reply-To`, format `from`), ameliorer fallback texte |
| `supabase/functions/send-test-email/index.ts` | Meme corrections headers + sujet sans emoji |
| `supabase/config.toml` | Ajouter `[functions.send-survey-copy]` avec `verify_jwt = false` pour portabilite |

**Changements concrets dans les Edge Functions:**

```typescript
// AVANT (spam-prone)
subject: `📋 Copie de vos réponses — ${survey_name}`,
from: fromEmail,

// APRES (professionnel)
subject: `Copie de vos réponses - ${survey_name}`,
from: `${appName} <${fromEmail}>`,
headers: {
  "Message-ID": `<survey-${Date.now()}@${fromEmail.split("@")[1]}>`,
  "Reply-To": fromEmail,
  "X-Mailer": appName,
},
```

### Ce qui reste cote administrateur serveur (pas cote code)

Pour une delivrabilite optimale, il faut aussi configurer cote DNS du domaine:
- **SPF** : `v=spf1 include:mail.votredomaine.com ~all`
- **DKIM** : signature numerique (configuration serveur mail)
- **DMARC** : `v=DMARC1; p=none; rua=mailto:admin@votredomaine.com`

Je mentionnerai ces recommandations dans l'interface Super Admin sous forme de guide.

