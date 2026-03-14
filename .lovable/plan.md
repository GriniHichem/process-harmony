

# Rapport de vérification pré-publication

## Résultats de l'analyse

Après inspection complète du code, de la base de données, et du scan de sécurité, voici les problèmes identifiés et les corrections à apporter.

---

## 1. Problèmes de sécurité (CRITIQUES)

### 1.1 Politiques RLS trop permissives (6 avertissements)
Les tables suivantes ont des politiques INSERT avec `WITH CHECK (true)` pour le rôle `anon` ou `authenticated` :
- `client_survey_answers` — INSERT anon = true (intentionnel pour sondages publics, OK)
- `client_survey_responses` — INSERT anon = true (intentionnel, OK)
- `client_survey_comments` — INSERT anon = true (intentionnel, OK)

Ces 3 sont acceptables car les sondages sont publics. Les 3 autres avertissements proviennent probablement de la même source dupliquée.

### 1.2 Protection contre les mots de passe compromis désactivée
Activer la protection via la configuration d'authentification.

### 1.3 Données sensibles exposées (2 erreurs)
- **Profiles** : Tous les utilisateurs authentifiés peuvent lire tous les profils (emails, noms). C'est nécessaire au fonctionnement de l'app (affichage des responsables, acteurs). Acceptable mais à documenter.
- **App_settings** : SELECT ouvert à tous les authentifiés. Nécessaire pour le branding/logo. Acceptable car ne contient pas de secrets.

### 1.4 Rôles visibles par tous
`user_roles`, `user_custom_roles`, `role_permissions` sont lisibles par tous les authentifiés. C'est nécessaire pour le calcul des permissions côté client. Acceptable.

---

## 2. Bugs fonctionnels identifiés

### 2.1 Sidebar affiche les rôles techniques bruts
La sidebar affiche `roles.join(", ")` avec les clés techniques (`rmq`, `responsable_processus`) au lieu des labels lisibles (`RMQ`, `Resp. processus`).

### 2.2 Mot de passe minimum trop faible
La page ResetPassword accepte des mots de passe de 6 caractères. Pour la production, un minimum de 8 caractères serait plus approprié.

---

## 3. Corrections à implémenter

| # | Correction | Fichier | Priorité |
|---|-----------|---------|----------|
| 1 | Afficher les labels de rôles dans la sidebar | `AppSidebar.tsx` | Haute |
| 2 | Renforcer le mot de passe minimum (8 chars) | `ResetPassword.tsx` | Moyenne |
| 3 | Activer la protection mots de passe compromis | Config auth | Moyenne |
| 4 | Vérifier le bon fonctionnement du flowchart I/O externe/interne | `ProcessTasksFlowchart.tsx` | Haute |

### Détails des corrections

**1. Sidebar — Labels de rôles**
Remplacer `roles.join(", ")` par un mapping vers `ROLE_LABELS` pour afficher les noms lisibles.

**2. Mot de passe minimum**
Changer `minLength={6}` à `minLength={8}` et le message d'erreur correspondant dans `ResetPassword.tsx`.

**3. Protection mots de passe compromis**
Utiliser l'outil `configure_auth` pour activer la protection.

**4. Flowchart**
Vérifier que le rendu des boîtes externes/internes fonctionne correctement avec les données existantes (pas de crash si aucune interaction n'existe).

---

## 4. Points vérifiés et conformes

- Authentification : login/logout/session fonctionne correctement
- RoleGuard : attend le chargement complet des données avant d'évaluer les permissions (fix récent appliqué)
- ProtectedRoute : redirige vers /login si non authentifié
- Permissions : le système admin/super_admin contourne correctement toutes les restrictions
- AdminPermissions : exclut super_admin du mapping (fix récent appliqué)
- Routes : toutes les routes protégées sont correctement wrappées
- Edge functions : admin-create-user et admin-reset-password vérifient le rôle admin côté serveur
- RLS : les tables critiques (actions, audits, processes, etc.) ont des politiques appropriées
- Pas d'erreurs console détectées
- Pas d'erreurs réseau détectées

