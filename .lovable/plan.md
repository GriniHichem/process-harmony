

# Plan: Mode Aide Contextuel — Definitions detaillees + Design premium

## Concept
Un bouton dans le header active/desactive un "mode aide" global. Quand actif, des icones discretes apparaissent a cote des termes cles. Au clic, un popover richement designe affiche la definition detaillee extraite du document de formation ISO 9001, avec une mise en forme pedagogique (icone de categorie, reference ISO, exemples).

## Fichiers a creer/modifier

### 1. `src/contexts/HelpModeContext.tsx` (nouveau)
- Context React simple: `helpMode: boolean`, `toggleHelpMode()`
- Persiste dans `localStorage("qprocess-help-mode")`

### 2. `src/lib/helpDefinitions.ts` (nouveau)
Dictionnaire complet avec definitions **detaillees** du PDF. Chaque entree contient:

```typescript
type HelpDefinition = {
  title: string;
  category: "concept" | "role" | "outil" | "indicateur" | "audit" | "pilotage";
  icon: string; // emoji pour la categorie
  definition: string; // paragraphe complet du PDF
  details?: string[]; // points cles sous forme de liste
  isoRef?: string; // reference ISO 9001 (ex: §4.4, §9.1.2)
  example?: string; // exemple concret
  source: string; // "Formation Management des Processus, p.XX"
};
```

Termes inclus (definitions completes extraites du PDF):

| Terme | Source PDF | Categorie |
|-------|-----------|-----------|
| `processus` | p.10 — "ensemble d'activites correlees ou en interaction..." | concept |
| `activite` | p.10 — "ensemble de taches correlees constituant une etape..." | concept |
| `client_processus` | p.10 — "beneficiaire du resultat du processus" | concept |
| `pilote_processus` | p.11+35 — definition + 8 responsabilites detaillees | role |
| `acteur` | p.11 — "celui qui realise une activite... interne ou externe" | role |
| `cartographie` | p.11 — "representation graphique d'un ensemble de processus" | outil |
| `approche_processus` | p.12+13+14 — definition + 3 finalites + gains | concept |
| `interaction` | p.12 — "action d'un processus sur un ou plusieurs autres" | concept |
| `interface` | p.12 — "limite commune a deux processus ou s'effectuent des echanges" | concept |
| `processus_management` | p.7 — politique, objectifs, allocation, coherence... | concept |
| `processus_realisation` | p.8 — "contribuent directement a la realisation du produit..." | concept |
| `processus_support` | p.9 — "indispensables au fonctionnement... ressources" + 3 types | concept |
| `indicateur` | p.29 — definition complete + role du tableau de bord | indicateur |
| `indicateur_activite` | p.38 — "quantites realisees, consommees, activite generee" | indicateur |
| `indicateur_resultat` | p.39 — objectifs du processus + conformite produit + 3 questions | indicateur |
| `indicateur_perception` | p.40 — "perception des clients et parties prenantes" | indicateur |
| `indicateur_interne` | p.41 — "fonctionnement du processus, caractere predictif" | indicateur |
| `tableau_bord` | p.29 — "outil de visualisation, analyse, decision, evaluation, communication" | outil |
| `smart` | p.42-44 — 5 lettres avec definitions completes de chacune | outil |
| `donnees_entree` | p.23 — "elements declenchant la mise en oeuvre du processus" | concept |
| `donnees_sortie` | p.23 — "production du processus: produits et/ou services" | concept |
| `risques_opportunites` | p.25 — "points necessitant surveillance: moments de verite clients, risques operationnels, financiers, mediatiques, juridiques" | pilotage |
| `revue_processus` | p.25 — "dispositif concret de pilotage et de maitrise du fonctionnement" | pilotage |
| `non_conformite` | — "ecart par rapport aux exigences definies" | audit |
| `audit` | p.17 — "evaluer l'efficacite et l'efficience du systeme de management" | audit |
| `action_amelioration` | p.27 — "action decidee suite a l'analyse des indicateurs" | audit |
| `document` | p.26 — "information documentee: fiche d'identite + carnet de sante" | outil |
| `satisfaction_client` | p.48 — indicateur de perception + exemples concrets | indicateur |
| `competences` | p.24 — "ressources humaines indispensables a la realisation" | role |
| `revue_direction` | p.27 — "comptes rendus de pilotage strategique, exploitation des resultats" | pilotage |
| `politique_qualite` | p.7 — "determination de la politique et deploiement des objectifs" | pilotage |
| `enjeux_contexte` | — "facteurs internes et externes influencant la strategie" | pilotage |
| `fournisseur` | — "prestataire externe concerne par les interactions des processus" | role |
| `management_processus` | p.31-32 — "decision strategique de la direction, responsabilite transversale" + 5 points | pilotage |

### 3. `src/components/HelpTooltip.tsx` (nouveau)
Design premium avec Popover:

**Structure du popover:**
```
┌─────────────────────────────────────────┐
│ 🏷️ CONCEPT ISO 9001          §4.4      │  ← header avec categorie + ref ISO
│─────────────────────────────────────────│
│ ⓘ Processus                            │  ← titre avec icone
│─────────────────────────────────────────│
│ Ensemble d'activites correlees ou en    │
│ interaction qui utilisent des elements  │  ← definition complete
│ d'entree pour produire un resultat...   │
│─────────────────────────────────────────│
│ Points cles:                            │
│ • Description exhaustive                │  ← details en liste
│ • Documentation formalisee              │
│ • Objectifs en coherence strategique    │
│─────────────────────────────────────────│
│ 💡 Exemple: processus de production...  │  ← exemple si disponible
│─────────────────────────────────────────│
│ 📖 Formation Management Processus, p.10 │  ← source
└─────────────────────────────────────────┘
```

**Style:**
- Largeur: `w-96` (384px) pour bien lire
- Fond: glass-card avec `backdrop-blur`
- Header: bande coloree par categorie (bleu=concept, vert=role, violet=outil, orange=indicateur, rouge=audit, indigo=pilotage)
- Texte: taille lisible (`text-sm`), interlignage genereux (`leading-relaxed`)
- Icone declencheur: petit `HelpCircle` 14px bleu avec animation pulse subtile
- Transition: `animate-in fade-in` fluide

### 4. `src/components/AppLayout.tsx` (modifier)
- Importer `HelpModeContext` provider
- Ajouter bouton `HelpCircle` dans le header (entre accessibilite et profil)
- Quand actif: bouton colore bleu + badge "Aide"
- Wrapper les children avec `<HelpModeProvider>`

### 5. `src/pages/Dashboard.tsx` (modifier)
- Ajouter `<HelpTooltip term="xxx" />` a cote de chaque titre de carte:
  - Processus → `processus`
  - Audits → `audit`
  - NC → `non_conformite`
  - Actions → `action_amelioration`
  - Risques → `risques_opportunites`
  - Indicateurs → `indicateur`
  - Incidents → `risques_opportunites`
- Ajouter tooltip sur le titre "Tableau de bord" → `tableau_bord`

### 6. `src/components/AppSidebar.tsx` (modifier)
- Ajouter `<HelpTooltip>` a cote des labels de groupe:
  - "Processus" → `processus`
  - "Manager processus" → `management_processus`
  - "Pilotage SMQ" → `politique_qualite`
  - "Audit & Amelioration" → `audit`

## Palette de couleurs par categorie
- `concept`: `bg-blue-500/10 text-blue-600 border-blue-200`
- `role`: `bg-emerald-500/10 text-emerald-600 border-emerald-200`
- `outil`: `bg-violet-500/10 text-violet-600 border-violet-200`
- `indicateur`: `bg-amber-500/10 text-amber-600 border-amber-200`
- `audit`: `bg-red-500/10 text-red-600 border-red-200`
- `pilotage`: `bg-indigo-500/10 text-indigo-600 border-indigo-200`

