

# Audit Email & Nettoyage des references Lovable

## Resultat de l'audit

### Edge Functions — Conformes a 100%

Les 7 Edge Functions sont **libres de toute reference Lovable** et **portables** :
- Zero URL hardcodee (`.supabase.co`, `.lovable.app`)
- SMTP 100% dynamique via `app_settings` (jamais de credentials hardcodes)
- `denomailer@1.6.0` utilise partout de maniere coherente
- Trigger `dispatch_notification_email()` : fallback multi-URL present (`kong:8000`, `host.docker.internal:54321`, `127.0.0.1:54321`)
- `check-deadlines` auto-configure `supabase_url` dans `app_settings`
- `verify_jwt = false` dans `config.toml` pour toutes les fonctions

### References Lovable restantes

| Fichier | Probleme |
|---|---|
| `package.json` | `lovable-tagger` dans devDependencies (ligne 94) |
| `README.md` | Tout le fichier reference Lovable (URLs, instructions) |
| `diagnostics/*.md` | Mentions "Lovable Cloud" (documentation interne — moins critique) |

Le `vite.config.ts` a deja ete nettoye (import `lovable-tagger` supprime).

## Plan d'implementation

### 1. Supprimer `lovable-tagger` de `package.json`
- Retirer la ligne `"lovable-tagger": "^1.1.13"` des `devDependencies`

### 2. Remplacer le contenu de `README.md`
- Ecrire un README generique pour Q-Process : description du projet, stack technique, instructions de deploiement self-hosted (variables d'environnement, migrations, Edge Functions)
- Zero mention de Lovable

### 3. (Optionnel) Nettoyer `diagnostics/*.md`
- Remplacer les references "Lovable Cloud" par "Cloud/SaaS" dans les fichiers de diagnostic
- Ces fichiers sont internes et ne sont pas exposes au client, donc c'est moins urgent

### Details techniques

- Les Edge Functions n'ont **aucune modification necessaire** — le code SMTP est deja conforme aux standards self-hosting
- Le fichier `.env` est auto-genere et ne contient rien de specifique a Lovable (juste `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`)
- Le `supabase/config.toml` contient le `project_id` qui changera naturellement lors du deploiement sur un autre serveur

