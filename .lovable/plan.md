

# Présentation d'accueil interactive — Onboarding Carousel

## Vue d'ensemble

Créer un carousel/slideshow premium qui s'affiche en plein écran lors de la première connexion de chaque utilisateur. Il présente l'application Q-Process, ses modules et avantages en 6 slides animées. L'utilisateur peut naviguer avec des flèches ou des dots, et un bouton "Commencer" sur le dernier slide ferme définitivement la présentation.

## Mécanisme "première visite"

- Stocker un flag `has_seen_onboarding` dans la table `profiles` (ou `localStorage` si on veut éviter une migration)
- Option retenue : **`localStorage`** avec clé `qprocess_onboarding_seen_{userId}` — simple, pas de migration, fonctionne par utilisateur
- Le composant se monte dans `AppLayout` après login, vérifie le flag, et s'affiche uniquement si absent

## Slides (6 slides)

```text
Slide 1 — Bienvenue
  Grande headline animée "Bienvenue sur Q-Process"
  Sous-titre : "Votre système intégré ISO 9001"
  Logo de l'entreprise, fond dégradé premium

Slide 2 — Gestion des Processus
  Icônes : Processus, Cartographie, BPMN, Documents
  "Modélisez, documentez et pilotez vos processus"

Slide 3 — Pilotage & Indicateurs  
  Icônes : Indicateurs, Risques, Enjeux, Incidents
  "Suivez vos KPIs, analysez vos risques"

Slide 4 — Qualité & Conformité
  Icônes : Audits, Non-conformités, Plans d'action
  "Auditez, corrigez, améliorez en continu"

Slide 5 — Pilotage SMQ
  Icônes : Revues, Compétences, Satisfaction, Fournisseurs
  "Pilotez votre SMQ de bout en bout"

Slide 6 — C'est parti !
  Bouton CTA "Commencer" avec animation
  "Votre espace est prêt. Explorez vos modules."
```

## Design premium

- Fond overlay sombre avec glassmorphism
- Chaque slide a un dégradé de couleur distinct (bleu, violet, emerald, rose, amber, primary)
- Animations d'entrée avec `animate-in fade-in slide-in`
- Dots de navigation en bas + flèches latérales
- Progression visuelle (barre ou dots actifs)
- Responsive : adapté mobile et desktop
- Bouton "Passer" discret en haut à droite sur chaque slide

## Fichiers

| Fichier | Action |
|---|---|
| `src/components/OnboardingCarousel.tsx` | Nouveau — composant carousel complet avec les 6 slides |
| `src/components/AppLayout.tsx` | Intégrer le carousel conditionnel après login |

## Détails techniques

- Pas de migration SQL nécessaire — `localStorage` par userId
- Utilisation des icônes Lucide déjà importées dans le projet
- Animations CSS avec Tailwind `animate-in`, `fade-in`, transitions custom
- Le carousel est un overlay `fixed inset-0 z-[100]` au-dessus de tout
- Settings `app_name`, `company_name`, `logo_url` lus depuis `useAppSettings()`

