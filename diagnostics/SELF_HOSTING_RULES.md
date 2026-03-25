##  **Prompt Universel — Développement Compatible Self-Hosting**

*Copiez-collez ce texte en début de conversation pour chaque nouveau projet.*

---

\# RÈGLES DE DÉVELOPPEMENT OBLIGATOIRES — Compatibilité Self-Hosting (Ubuntu/Docker \+ Supabase)

Ce projet DOIT pouvoir fonctionner en environnement self-hosted (Supabase local ou Docker).  
Toutes les règles ci-dessous sont IMPÉRATIVES et s'appliquent à CHAQUE fonctionnalité développée.

\---

\#\# 1\. Edge Functions

\- TOUJOURS configurer \`verify\_jwt \= false\` dans \`supabase/config.toml\` pour chaque fonction  
\- L'authentification est gérée MANUELLEMENT dans le code Deno :  
  \- Lire le header \`Authorization\`  
  \- Créer un client Supabase avec ce header  
  \- Appeler \`getUser()\` ou \`getClaims()\` pour vérifier l'identité  
  \- Vérifier les rôles via une fonction \`has\_role()\` RPC avec un client \`service\_role\`  
\- CORS obligatoire sur TOUTES les réponses (succès, erreurs, OPTIONS) :  
  \`\`\`typescript  
  const corsHeaders \= {  
    "Access-Control-Allow-Origin": "\*",  
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",  
  };  
  // Traiter OPTIONS en premier  
  if (req.method \=== "OPTIONS") {  
    return new Response(null, { headers: corsHeaders });  
  }

* JAMAIS de verify\_jwt \= true (bloque les appels en self-hosted)

---

## **2\. Appels Frontend → Edge Functions**

* TOUJOURS utiliser supabase.functions.invoke('nom-fonction', { body: {...} })  
* JAMAIS de fetch() direct vers /functions/v1/... (perd le JWT, cause 401\)  
* Le client Supabase gère automatiquement le JWT et les headers

---

## **3\. Migrations SQL**

* TOUJOURS CREATE TABLE IF NOT EXISTS  
* TOUJOURS CREATE INDEX IF NOT EXISTS  
* TOUJOURS CREATE TYPE IF NOT EXISTS ou bloc DO $$ BEGIN ... EXCEPTION WHEN duplicate\_object THEN NULL; END $$; pour les enums  
* TOUJOURS INSERT INTO ... ON CONFLICT DO NOTHING pour les données seed (buckets, settings, rôles)  
* Chaque migration DOIT être idempotente (rejouable sans erreur)  
* JAMAIS de ALTER DATABASE postgres (interdit par Supabase)  
* JAMAIS de modification des schémas réservés : auth, storage, realtime, supabase\_functions, vault  
* Utiliser des triggers de validation au lieu de CHECK constraints pour les validations temporelles (expire\_at \> now())

---

## **4\. Storage Buckets**

* Création TOUJOURS avec INSERT INTO storage.buckets (...) ON CONFLICT (id) DO NOTHING  
* JAMAIS de INSERT INTO storage.buckets sans ON CONFLICT

---

## **5\. Realtime**

* Pour chaque table utilisant postgres\_changes, inclure dans la migration : ALTER PUBLICATION supabase\_realtime ADD TABLE public.nom\_table;  
* JAMAIS supposer que la publication Realtime est activée automatiquement

---

## **6\. SMTP & Emails**

* Configuration SMTP exclusivement via une table app\_settings (clés : smtp\_host, smtp\_port, smtp\_user, smtp\_password, support\_email, app\_name)  
* Les Edge Functions d'envoi email utilisent denomailer avec config lue depuis app\_settings  
* Les triggers DB qui envoient des emails doivent inclure un fallback multi-URL pour self-hosted :  
  * kong:8000 (réseau Docker interne)  
  * host.docker.internal:54321 (Docker Desktop)  
  * 127.0.0.1:54321 (accès local direct)  
*   
* JAMAIS de SMTP hardcodé dans le code

---

## **7\. Fonctionnalités IA**

* Le secret LOVABLE\_API\_KEY et l'URL ai.gateway.lovable.dev sont EXCLUSIFS à Lovable Cloud  
* Toute fonctionnalité IA DOIT prévoir un fallback configurable :  
  1. Si LOVABLE\_API\_KEY est disponible → utiliser le gateway Lovable  
  2. Sinon → lire une clé API custom (OpenAI, Gemini, etc.) depuis app\_settings  
*   
* JAMAIS de dépendance exclusive au gateway Lovable sans fallback

---

## **8\. Plugin lovable-tagger**

* Garder STRICTEMENT conditionnel : mode \=== "development" && componentTagger()  
* Filtrer avec .filter(Boolean) pour éviter les erreurs si le package n'est pas installé  
* JAMAIS inclure en mode production

---

## **9\. Extension pg\_net**

* Si des triggers DB appellent des Edge Functions via net.http\_post(), inclure : CREATE EXTENSION IF NOT EXISTS pg\_net WITH SCHEMA extensions;  
* Encapsuler dans EXCEPTION WHEN OTHERS THEN NULL pour les environnements sans pg\_net  
* Documenter que sans pg\_net, les notifications email depuis les triggers seront ignorées (le push in-app fonctionne toujours)

---

## **10\. Configuration Auth (GoTrue)**

* En Lovable Cloud : utiliser l'outil configure\_auth  
* En self-hosted : configurer dans docker-compose.yml ou .env de GoTrue :  
  * GOTRUE\_MAILER\_AUTOCONFIRM (si auto-confirm souhaité)  
  * GOTRUE\_SMTP\_HOST, GOTRUE\_SMTP\_PORT, GOTRUE\_SMTP\_USER, GOTRUE\_SMTP\_PASS  
  * GOTRUE\_SITE\_URL (URL du frontend)  
*   
* NE JAMAIS activer l'auto-confirm email sauf demande explicite de l'utilisateur  
* TOUJOURS implémenter l'authentification (signup/login) si des tables ont des RLS policies  
* JAMAIS d'inscription anonyme

---

## **11\. Variables d'Environnement**

* Frontend (VITE\_\*) : VITE\_SUPABASE\_URL, VITE\_SUPABASE\_PUBLISHABLE\_KEY  
* Vérifier leur présence avant usage critique  
* JAMAIS de secrets privés dans les variables VITE\_\* (exposées dans le bundle)  
* Edge Functions : utiliser Deno.env.get('SUPABASE\_URL') et Deno.env.get('SUPABASE\_SERVICE\_ROLE\_KEY')

---

## **12\. URLs et Domaines**

* JAMAIS hardcoder d'URLs .supabase.co dans le code applicatif  
* JAMAIS hardcoder d'URLs .lovable.app dans le code applicatif  
* Frontend : import.meta.env.VITE\_SUPABASE\_URL  
* Edge Functions : Deno.env.get('SUPABASE\_URL')  
* Triggers DB : lire depuis la table app\_settings (clé supabase\_url)

---

## **13\. Rôles Utilisateurs & Sécurité**

* Les rôles DOIVENT être stockés dans une table user\_roles séparée (JAMAIS sur profiles)  
* Utiliser une fonction has\_role(user\_id, role) en SECURITY DEFINER pour les vérifications RLS  
* JAMAIS vérifier le statut admin via localStorage ou credentials hardcodés  
* Les opérations admin (création utilisateur, reset password) passent par des Edge Functions dédiées

---

## **14\. Checklist Pré-Développement**

Avant chaque nouvelle fonctionnalité, vérifier :

*  Edge Functions avec verify\_jwt \= false \+ auth manuelle  
*  Appels via supabase.functions.invoke() uniquement  
*  Migrations idempotentes (IF NOT EXISTS, ON CONFLICT)  
*  Pas de dépendance exclusive à Lovable Cloud  
*  Realtime activé pour les tables concernées  
*  Storage buckets avec ON CONFLICT DO NOTHING  
*  Variables d'environnement documentées et vérifiées  
*  Aucune URL hardcodée  
*  RLS policies \+ authentification implémentée  
*  CORS complet sur toutes les Edge Functions

\---

Ce prompt est \*\*générique et réutilisable\*\* pour tout projet de gestion (ISO 9001, ERP, CRM, etc.) développé sur Lovable avec objectif de déploiement self-hosted.  
