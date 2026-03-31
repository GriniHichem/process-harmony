

# Systeme de Licence — Super Admin

## Vue d'ensemble

Implementer un systeme complet de gestion de licence dans le Super Admin, avec periode d'essai, activation par code 32 caracteres, alertes configurables, et blocage global en mode lecture seule a l'expiration.

## Cycle de vie de la licence

```text
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌─────────────┐
│  Essai       │───>│  Licence     │───>│  Grace (1 mois)  │───>│  Bloquee    │
│  (N jours)   │    │  Active      │    │  Alertes visibles│    │  Lecture    │
│              │    │              │    │                  │    │  seule      │
└─────────────┘    └──────────────┘    └──────────────────┘    └─────────────┘
       │                                                              │
       └──────────────── Code 32 chars ──────────────────────────────>│
                         = Reactivation                               │
```

## Parametres stockes dans `app_settings`

| Cle | Defaut | Description |
|---|---|---|
| `license_mode` | `trial` | `trial`, `active`, `grace`, `expired` |
| `license_key` | `""` | Code 32 caracteres d'activation |
| `license_trial_days` | `30` | Duree periode d'essai en jours |
| `license_trial_start` | date installation | Date debut essai |
| `license_activated_at` | `""` | Date d'activation de la licence |
| `license_expires_at` | `""` | Date expiration licence |
| `license_alert_days_before` | `90` | Jours avant expiration pour notifier (defaut 3 mois) |
| `license_alert_interval_days` | `7` | Frequence des rappels d'alerte |
| `license_grace_days` | `30` | Duree du mois de grace apres expiration |

## Implementation — 4 parties

### 1. Migration SQL : valeurs par defaut licence

Inserer les cles de licence dans `app_settings` avec les valeurs par defaut (trial_start = now()).

### 2. Contexte Licence (`LicenseContext.tsx`)

Nouveau contexte qui :
- Lit les parametres licence depuis `AppSettings`
- Calcule l'etat courant (`trial`, `active`, `grace`, `expired`) et les jours restants
- Expose `isReadOnly` (true si `expired`), `licenseStatus`, `daysRemaining`, `alertMessage`
- Expose `activateLicense(code: string)` qui valide le code (32 chars alphanumeriques), met a jour `license_mode = active`, `license_key`, `license_activated_at`
- Logique de calcul :
  - **Trial** : `trial_start + trial_days > now()` sinon passe en `grace`
  - **Active** : `expires_at > now()` sinon passe en `grace`
  - **Grace** : `expires_at + grace_days > now()` sinon `expired`
  - **Expired** : mode lecture seule

### 3. Blocage global en mode lecture seule

- Wrapper dans `AppLayout` : si `isReadOnly`, afficher un bandeau permanent en haut "Licence expiree — Mode consultation uniquement"
- Intercepter `hasPermission` dans `AuthContext` : si licence expiree, `can_edit`, `can_delete` retournent toujours `false`, seul `can_read` et `can_read_detail` restent actifs
- Bloquer les notifications (ne pas envoyer de nouvelles notifications)

### 4. Onglet "Licence" dans Super Admin

Nouvel onglet avec :
- **Etat actuel** : badge colore (Essai/Active/Grace/Expiree) + jours restants
- **Configuration essai** : duree en jours
- **Configuration alertes** : jours avant expiration, intervalle des rappels
- **Duree de grace** : configurable
- **Date d'expiration** : date picker pour la licence active
- **Activation** : champ input 32 caracteres + bouton "Activer". Validation : exactement 32 chars alphanumeriques. Succes = toast + statut passe a `active`
- **Bandeau d'alerte** visible dans toute l'app quand on est dans la zone d'alerte ou en grace

## Alertes et messages

| Phase | Message |
|---|---|
| Essai, X jours restants | "Periode d'essai : X jours restants" (bandeau bleu) |
| Active, dans zone alerte | "Votre licence expire dans X jours" (bandeau jaune) |
| Grace | "Licence expiree ! Les services seront bloques dans X jours" (bandeau orange) |
| Expiree | "Licence expiree — Mode consultation uniquement. Activez votre licence." (bandeau rouge fixe) |

## Fichiers

| Fichier | Action |
|---|---|
| Migration SQL | Insert cles licence dans `app_settings` |
| `src/contexts/AppSettingsContext.tsx` | Ajouter les cles licence au type `AppSettings` |
| `src/contexts/LicenseContext.tsx` | Nouveau — calcul statut, `isReadOnly`, activation |
| `src/components/LicenseBanner.tsx` | Nouveau — bandeau d'alerte contextuel |
| `src/components/AppLayout.tsx` | Integrer `LicenseBanner` |
| `src/contexts/AuthContext.tsx` | Integrer `isReadOnly` pour bloquer edit/delete |
| `src/pages/SuperAdmin.tsx` | Ajouter onglet "Licence" |
| `src/App.tsx` | Wrapper `LicenseProvider` |

