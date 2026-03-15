

## Analyse et diagnostic

Le probleme est clair apres analyse du code. Sur votre serveur local (apres migration), deux bugs empechent le test email de fonctionner :

### Bug 1 : Les parametres SMTP ne sont jamais enregistres en base

Dans `AppSettingsContext.tsx` ligne 78, la sauvegarde utilise `.update()` :
```typescript
await supabase.from("app_settings").update({ value }).eq("key", key);
```
Si les cles SMTP (`smtp_host`, `smtp_user`, `support_email`, `smtp_port`) n'existent pas encore dans la table `app_settings` de votre serveur migre, `.update()` met a jour 0 lignes sans erreur. Les parametres ne sont donc jamais sauvegardes. La fonction `send-test-email` lit ensuite une base vide et retourne 400 "Configuration SMTP incomplete".

### Bug 2 : L'UI masque le vrai message d'erreur

Dans `SuperAdmin.tsx` ligne 264, le code fait :
```typescript
const { data, error } = await supabase.functions.invoke("send-test-email", ...);
if (error) throw error;
```
Le SDK Supabase cree une erreur generique "Edge Function returned a non-2xx status code" sans inclure le message JSON du serveur. Le vrai message ("Configuration SMTP incomplete") est perdu.

### Bug 3 : Migration manque les cles SMTP dans app_settings

La migration initiale insere seulement les cles branding (app_name, company_name, etc.) mais pas les cles SMTP. Sur un nouveau serveur, ces cles n'existent pas.

---

## Plan de correction

### 1. Changer `.update()` en `.upsert()` dans AppSettingsContext
Modifier `updateSetting` pour utiliser `.upsert({ key, value, updated_at }, { onConflict: "key" })` au lieu de `.update().eq("key", key)`. Cela garantit que les cles sont creees si elles n'existent pas.

### 2. Corriger l'affichage d'erreur dans SuperAdmin
Modifier le catch du test email pour lire `data?.error` meme quand le status est non-2xx. Le SDK Supabase retourne quand meme `data` dans certains cas, ou utiliser `fetch` direct pour acceder au body JSON.

### 3. Migration de rattrapage pour les cles SMTP
Ajouter une migration SQL qui insere les cles manquantes (`smtp_host`, `smtp_port`, `smtp_user`, `support_email`) avec des valeurs vides par defaut, en utilisant `ON CONFLICT DO NOTHING`.

### 4. Ajouter `verify_jwt = false` dans config.toml
Pour `send-test-email`, `send-survey-copy`, et `admin-save-smtp-password`, ajouter la configuration JWT dans `config.toml` pour la portabilite sur serveur local.

---

### Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/contexts/AppSettingsContext.tsx` | `.update()` → `.upsert()` |
| `src/pages/SuperAdmin.tsx` | Parsing erreur ameliore pour afficher le vrai message |
| `supabase/migrations/` (nouveau) | INSERT des cles SMTP manquantes |

