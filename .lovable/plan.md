

# Plan : Enrichir le prompt de développement avec les scénarios bloquants supplémentaires

## Analyse des risques identifiés dans le codebase

Après inspection complète du projet, voici les scénarios supplémentaires qui peuvent bloquer la migration self-hosted, au-delà de ceux déjà documentés :

### 1. **Lovable AI Gateway (`LOVABLE_API_KEY`)**
- Le secret `LOVABLE_API_KEY` est provisionné automatiquement par Lovable Cloud
- Si une fonctionnalité IA est ajoutée via `ai.gateway.lovable.dev`, elle ne fonctionnera PAS en self-hosted (URL inaccessible, clé invalide)
- **Règle** : Toute intégration IA doit prévoir un fallback configurable (clé OpenAI/Gemini propre stockée dans `app_settings`)

### 2. **`lovable-tagger` dans `vite.config.ts`**
- Le plugin `componentTagger` est importé et utilisé en mode dev
- En self-hosted, ce package npm peut ne pas être disponible ou provoquer des erreurs de build
- **Règle** : S'assurer que c'est conditionnel (`mode === "development"`) — c'est déjà le cas ici, mais ne jamais l'ajouter en production

### 3. **Realtime (notifications)**
- `NotificationBell.tsx` utilise `supabase.channel("notifications-realtime")` avec `postgres_changes`
- En self-hosted, la publication Realtime doit être activée manuellement : `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`
- **Règle** : Toujours inclure l'activation Realtime dans les migrations

### 4. **Storage buckets**
- 3 buckets (`documents`, `survey-images`, `branding`) sont utilisés dans 5+ fichiers
- Les migrations qui font `INSERT INTO storage.buckets` échouent si le bucket existe déjà
- **Règle** : Toujours utiliser `ON CONFLICT DO NOTHING` pour les insertions storage

### 5. **`pg_net` extension**
- `dispatch_notification_email()` utilise `net.http_post()` qui dépend de `pg_net`
- Cette extension n'est pas toujours disponible en self-hosted
- **Règle** : Prévoir un fallback ou documenter l'installation de `pg_net`

### 6. **Auto-confirm email**
- En Lovable Cloud, l'auto-confirm peut être activé via l'outil `configure_auth`
- En self-hosted, il faut configurer GoTrue directement (`GOTRUE_MAILER_AUTOCONFIRM=true`)
- **Règle** : Documenter la configuration auth GoTrue pour self-hosted

### 7. **`SurveyPublicPage` crée un client Supabase séparé**
- Utilise `import.meta.env.VITE_SUPABASE_URL` directement — correct mais fragile si les variables ne sont pas définies
- **Règle** : Toujours vérifier que les variables `VITE_*` sont définies avant usage

## Ce qui sera mis à jour

Mise à jour du fichier `.lovable/plan.md` pour ajouter une nouvelle section **"Phase 7 : Règles de compatibilité self-hosting"** contenant tous les scénarios bloquants sous forme de checklist impérative, à consulter avant tout développement.

Le contenu couvrira :
1. Edge Functions : `verify_jwt = false` + auth manuelle + CORS complet
2. Appels frontend : `supabase.functions.invoke()` obligatoire
3. SMTP : config via `app_settings` uniquement
4. Migrations : `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` systématique
5. **NOUVEAU** : Lovable AI → interdire `ai.gateway.lovable.dev` sans fallback
6. **NOUVEAU** : `lovable-tagger` → garder conditionnel, jamais en prod
7. **NOUVEAU** : Realtime → inclure `ALTER PUBLICATION` dans les migrations
8. **NOUVEAU** : Storage → `ON CONFLICT DO NOTHING` pour les buckets
9. **NOUVEAU** : `pg_net` → documenter la dépendance, prévoir fallback
10. **NOUVEAU** : Auth GoTrue → documenter `GOTRUE_MAILER_AUTOCONFIRM`
11. **NOUVEAU** : Variables `VITE_*` → vérification obligatoire côté client
12. **NOUVEAU** : Ne jamais hardcoder d'URLs `.supabase.co` ou `.lovable.app`

