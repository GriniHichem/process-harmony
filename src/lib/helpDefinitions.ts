export type HelpCategory = "concept" | "role" | "outil" | "indicateur" | "audit" | "pilotage";

export interface HelpDefinition {
  title: string;
  category: HelpCategory;
  definition: string;
  details?: string[];
  isoRef?: string;
  example?: string;
  source: string;
}

export const categoryMeta: Record<HelpCategory, { label: string; emoji: string; color: string }> = {
  concept:    { label: "Concept ISO 9001",    emoji: "📘", color: "blue" },
  role:       { label: "Rôle & Responsabilité", emoji: "👤", color: "emerald" },
  outil:      { label: "Outil & Méthode",     emoji: "🛠️", color: "violet" },
  indicateur: { label: "Indicateur",          emoji: "📊", color: "amber" },
  audit:      { label: "Audit & Amélioration", emoji: "🔍", color: "red" },
  pilotage:   { label: "Pilotage & Stratégie", emoji: "🎯", color: "indigo" },
};

export const helpDefinitions: Record<string, HelpDefinition> = {
  // ══════════════════════════════════════════
  //  CONCEPTS FONDAMENTAUX
  // ══════════════════════════════════════════
  processus: {
    title: "Processus",
    category: "concept",
    isoRef: "§4.4",
    definition:
      "Ensemble d'activités corrélées ou en interaction qui utilisent des éléments d'entrée pour produire un résultat escompté. La définition d'un processus permet de couvrir l'ensemble des informations qui lui sont relatives.",
    details: [
      "Description exhaustive de toutes les activités",
      "Documentation formalisant les données nécessaires au fonctionnement",
      "Objectifs définis en cohérence avec la stratégie de l'organisme",
      "Indicateurs rassemblés dans un tableau de bord",
      "Données de pilotage pour la maîtrise et l'amélioration",
    ],
    example:
      "Processus « Cuisiner et servir un repas » : de l'accueil du client à la facturation, en passant par la prise de commande, la cuisine et le service.",
    source: "p.10 & p.22",
  },

  activite: {
    title: "Activité",
    category: "concept",
    definition:
      "Ensemble de tâches corrélées constituant une étape de transformation au sein d'un processus. Chaque activité consomme des ressources et produit des éléments qui alimentent l'étape suivante.",
    example: "Le déroulement des étapes clés du processus : accueil, prise de commande, cuisine, service, facturation.",
    source: "p.10 & p.49",
  },

  client_processus: {
    title: "Client du processus",
    category: "concept",
    definition:
      "Bénéficiaire du résultat du processus. Le client peut être interne (un autre service, un autre processus) ou externe (le client final de l'organisme). L'approche processus place le client au cœur du fonctionnement de l'organisme.",
    source: "p.10",
  },

  approche_processus: {
    title: "Approche processus",
    category: "concept",
    isoRef: "§0.3",
    definition:
      "Manière d'envisager le management de l'entreprise en s'appuyant sur les processus et leurs interactions. Elle implique une vision transversale de l'organisme structuré selon une série de processus cohérents et orientés clients.",
    details: [
      "Mieux répondre aux besoins et attentes des clients et parties intéressées",
      "Déployer la politique et les objectifs de façon structurée à tous les niveaux",
      "Optimiser les résultats par une meilleure implication et coordination des acteurs",
      "Gains en performance, conformité, qualité, délais, maîtrise des coûts",
      "Détection, correction et prévention des dysfonctionnements",
      "Prise en compte des exigences légales, réglementaires et sociétales",
      "Dynamique d'amélioration permanente ou de transformation des processus",
    ],
    example: "Le principe s'applique à tous types d'organismes quels que soient leur taille et leur domaine d'activité.",
    source: "p.12-16 & p.18-19",
  },

  interaction: {
    title: "Interaction entre processus",
    category: "concept",
    definition:
      "Action d'un processus sur un ou plusieurs autres processus. Il peut être utile de « contractualiser » les conditions des échanges d'éléments entre processus et d'associer des indicateurs à la tenue des engagements réciproques.",
    source: "p.12 & p.24",
  },

  interface: {
    title: "Interface entre processus",
    category: "concept",
    definition:
      "Limite commune à deux processus où s'effectuent des échanges. La maîtrise des interfaces est améliorée par une meilleure compréhension des besoins et contraintes, une communication efficace entre les acteurs, et une définition claire des circuits d'informations et de prises de décisions.",
    source: "p.12 & p.15",
  },

  processus_management: {
    title: "Processus de management",
    category: "concept",
    isoRef: "§5",
    definition:
      "Ils comprennent la détermination de la politique, le déploiement des objectifs dans l'organisme, l'allocation des ressources. Ils assurent la cohérence des processus de réalisation et de support. Ils incluent la mesure et la surveillance du système de processus et l'exploitation des résultats en vue de l'amélioration des performances.",
    source: "p.7",
  },

  processus_realisation: {
    title: "Processus de réalisation",
    category: "concept",
    isoRef: "§8",
    definition:
      "Ils contribuent directement à la réalisation du produit, de la détection du besoin du client à sa satisfaction. Ils regroupent les activités liées au cycle de réalisation du produit.",
    source: "p.8",
  },

  processus_support: {
    title: "Processus de support",
    category: "concept",
    isoRef: "§7",
    definition:
      "Ils sont indispensables au fonctionnement de l'ensemble des processus en leur fournissant les ressources nécessaires.",
    details: [
      "Ressources humaines et financières",
      "Installations et leur entretien (locaux, équipements, matériels, logiciels, etc.)",
      "Traitement de l'information",
    ],
    example:
      "Selon la finalité de l'organisme, un même type de processus peut être considéré soit comme processus de réalisation soit comme processus de support.",
    source: "p.9",
  },

  donnees_entree: {
    title: "Données d'entrée",
    category: "concept",
    isoRef: "§4.4",
    definition:
      "Éléments déclenchant la mise en œuvre du processus. Les données d'entrée doivent être identifiées en indiquant notamment celles qui déclenchent le démarrage du processus.",
    example: "Demande client, commande, matières premières, informations transmises par un autre processus.",
    source: "p.23",
  },

  donnees_sortie: {
    title: "Données de sortie",
    category: "concept",
    isoRef: "§4.4",
    definition:
      "Éléments de sortie qui concrétisent la « production » du processus de produits et/ou de services. Ils représentent le résultat escompté du processus.",
    source: "p.23 & p.50",
  },

  finalite: {
    title: "Finalité du processus",
    category: "concept",
    isoRef: "§4.4",
    definition:
      "La raison d'être du processus. Elle détermine pourquoi le processus existe et ce qu'il doit accomplir. Le titre du processus doit présenter son utilité, il comporte généralement un verbe d'action et un complément d'objet direct.",
    example: "« Élaborer une commande », « Cuisiner et servir un repas ».",
    source: "p.23 & p.49",
  },

  perimetre: {
    title: "Périmètre du processus",
    category: "concept",
    definition:
      "Délimitation du champ d'application du processus. Les champs d'application peuvent être évolutifs et de différents niveaux : un organisme multi-sites, un site particulier, un département, un service, une unité.",
    source: "p.16 & p.23",
  },

  sequence: {
    title: "Séquence du processus",
    category: "concept",
    definition:
      "Identification des différentes étapes clés du processus. La séquence décrit le déroulement ordonné des activités qui composent le processus, en général sous forme de logigramme.",
    source: "p.24 & p.26",
  },

  valeur_ajoutee: {
    title: "Valeur ajoutée",
    category: "concept",
    definition:
      "L'approche processus est fondée sur la priorité donnée à la valeur ajoutée. Elle permet des gains significatifs en termes de performance, de conformité et de qualité des produits et services, de délais, de maîtrise des coûts et de gestion des risques.",
    source: "p.14",
  },

  domaine_application: {
    title: "Domaine d'application",
    category: "concept",
    isoRef: "§4.3",
    definition:
      "Le principe de l'approche processus s'applique à tous types d'organismes quels que soient leur taille et leur domaine d'activité, et aux différents systèmes de management mis en œuvre (qualité, sécurité, environnement…).",
    details: [
      "Un organisme multi-sites",
      "Un site particulier",
      "Un département, un service, une unité",
    ],
    source: "p.16",
  },

  // ══════════════════════════════════════════
  //  RÔLES & RESPONSABILITÉS
  // ══════════════════════════════════════════
  pilote_processus: {
    title: "Pilote de processus",
    category: "role",
    isoRef: "§5.3",
    definition:
      "Personne désignée par la direction qui a la responsabilité d'un ou de plusieurs processus. Il est chargé de la mise en œuvre, de la surveillance, de l'amélioration et de la transformation du ou des processus en lien avec la stratégie de l'organisme.",
    details: [
      "Surveiller et mesurer son processus",
      "S'assurer qu'il produit des résultats attendus par rapport aux objectifs fixés",
      "Proposer toute action visant l'amélioration du processus",
      "Recueillir et exploiter en permanence les informations relatives au processus",
      "Décider de toute action visant à corriger des dysfonctionnements",
      "Veiller à l'utilisation optimale des ressources allouées",
      "Réaliser une revue de processus périodiquement",
      "Assurer la mise en œuvre des actions décidées",
    ],
    source: "p.11 & p.35",
  },

  acteur: {
    title: "Acteur",
    category: "role",
    definition:
      "Celui qui réalise une activité dans le cadre d'un processus. Il peut être interne ou externe à l'organisme. Les acteurs et leurs rôles doivent être identifiés dans la description du processus.",
    details: [
      "Personnel : donner du sens pour satisfaire le client",
      "Cadres dirigeants : améliorer la performance globale",
      "Managers : coopérer pour un fonctionnement optimum",
      "Pilotes de processus : améliorer et piloter la performance",
      "Gestionnaire de processus : contribuer à l'amélioration et au pilotage",
      "Contributeurs : contribuer à l'amélioration et au pilotage",
      "Auditeurs : comprendre la vision processus et ses apports opérationnels",
    ],
    source: "p.11 & p.36",
  },

  direction: {
    title: "Direction",
    category: "role",
    isoRef: "§5.1",
    definition:
      "La direction est directement responsable de la sélection des processus stratégiques. Le management par les processus est une décision stratégique de la direction qui nécessite une implication forte pour déployer l'approche processus, dynamiser et améliorer la performance de l'organisme.",
    source: "p.17-18 & p.31",
  },

  contributeur: {
    title: "Contributeur",
    category: "role",
    definition:
      "Acteur qui contribue à l'amélioration et au pilotage des processus. Les contributeurs sont identifiés par le pilote de processus et participent activement au fonctionnement et à l'amélioration continue.",
    source: "p.36",
  },

  auditeur: {
    title: "Auditeur",
    category: "role",
    isoRef: "§9.2",
    definition:
      "L'auditeur aide à évaluer l'efficacité et l'efficience du système de management. Il doit comprendre la vision processus et ses apports opérationnels pour vérifier la conformité des pratiques.",
    source: "p.17 & p.36",
  },

  fournisseur: {
    title: "Fournisseur / Prestataire externe",
    category: "role",
    isoRef: "§8.4",
    definition:
      "Prestataire externe concerné par les interactions des processus. La communication avec les prestataires externes fait partie de la maîtrise des interfaces entre processus.",
    source: "p.15",
  },

  competences: {
    title: "Compétences & Ressources humaines",
    category: "role",
    isoRef: "§7.2",
    definition:
      "Ressources humaines indispensables à la réalisation des processus. Les acteurs (internes et externes) et leurs rôles doivent être identifiés, ainsi que les ressources spécifiques : matérielles, informationnelles ou humaines (acteurs, services, experts…).",
    source: "p.24 & p.50",
  },

  parties_interessees: {
    title: "Parties intéressées",
    category: "role",
    isoRef: "§4.2",
    definition:
      "Clients (internes et externes) et parties intéressées pertinentes du processus. L'organisme doit déterminer les parties intéressées pertinentes et leurs exigences. L'approche processus vise à mieux répondre à leurs besoins et attentes.",
    source: "p.13 & p.23",
  },

  // ══════════════════════════════════════════
  //  INDICATEURS (4 types + règles)
  // ══════════════════════════════════════════
  indicateur: {
    title: "Indicateur",
    category: "indicateur",
    isoRef: "§9.1",
    definition:
      "Mesure définie par le pilote de processus, en concertation avec tous les acteurs du processus, permettant d'évaluer et d'améliorer le processus. Les objectifs et le résultat des mesures sont consolidés dans un ou des tableaux de bords.",
    details: [
      "Suivre au moins un indicateur pour chaque objectif du processus",
      "Disposer d'au moins un indicateur de résultat",
      "Avoir un indicateur de perception",
      "Utiliser des indicateurs internes de pilotage pour réagir à temps",
    ],
    source: "p.29 & p.41",
  },

  type_indicateurs: {
    title: "Les 4 types d'indicateurs",
    category: "indicateur",
    isoRef: "§9.1",
    definition:
      "Il existe 4 types d'indicateurs pour la surveillance d'un processus. Chacun remplit un rôle complémentaire dans le pilotage de la performance.",
    details: [
      "Indicateurs d'activité — quantités réalisées, consommées, activité générée",
      "Indicateurs de résultat — atteinte des objectifs et conformité du produit/service",
      "Indicateurs de perception — ressenti et satisfaction des clients et parties prenantes",
      "Indicateurs internes — fonctionnement du processus, caractère prédictif",
    ],
    source: "p.37",
  },

  indicateur_activite: {
    title: "Indicateur d'activité",
    category: "indicateur",
    definition:
      "Ils renseignent sur les quantités réalisées, les quantités consommées, l'activité générée. Ils permettent d'ajuster les ressources du processus aux fluctuations d'activité.",
    example:
      "Temps d'attente du client entre son arrivée et la prise de commande ; temps moyen de passage d'un client entre son arrivée et son départ.",
    source: "p.38 & p.48",
  },

  indicateur_resultat: {
    title: "Indicateur de résultat",
    category: "indicateur",
    definition:
      "Ils renseignent sur l'atteinte des objectifs du processus et sur la conformité du produit ou du service. Ne pas confondre avec des indicateurs liés aux moyens mis en œuvre.",
    details: [
      "Qu'est-ce que je veux garantir en terme de coût du produit ou du processus ?",
      "Comment je m'assure de la conformité du produit ou du service ?",
      "Qu'est-ce que je veux garantir en terme de respect des délais et de réactivité ?",
    ],
    example:
      "Taux de perte sur les produits d'entrée ; nombre de couverts servis ; prix moyen d'un couvert ; marge brute par couvert.",
    source: "p.39 & p.48",
  },

  indicateur_perception: {
    title: "Indicateur de perception",
    category: "indicateur",
    definition:
      "Ils renseignent sur la perception qu'ont les clients et les autres parties prenantes du processus. Ils permettent de mesurer le ressenti et la satisfaction.",
    example:
      "Évaluation laissée par le client sur le livre d'or ; notes et avis sur internet ; pourcentage de clients fidèles ; nombre de plats renvoyés en cuisine.",
    source: "p.40 & p.48",
  },

  indicateur_interne: {
    title: "Indicateur interne du processus",
    category: "indicateur",
    definition:
      "Ils renseignent sur le déroulement et le fonctionnement du processus et permettent au pilote de prendre des décisions qui auront un impact sur le résultat lorsqu'il est encore temps. Ils ont un caractère prédictif d'une situation désirée ou non-désirée.",
    example:
      "L'indicateur n'est pas nécessairement une valeur mesurée : il peut consister à observer l'apparition d'un événement qui alerte le pilote (ex : le voyant de la jauge d'essence sur une voiture).",
    source: "p.41",
  },

  satisfaction_client: {
    title: "Satisfaction client",
    category: "indicateur",
    isoRef: "§9.1.2",
    definition:
      "Indicateur de perception mesurant le ressenti et la satisfaction des clients et des parties prenantes du processus. Il fait partie des indicateurs essentiels pour évaluer la performance.",
    example:
      "Évaluation laissée par le client sur le livre d'or à sa sortie ; note et avis sur internet (ex : Tripadvisor) ; pourcentage de clients fidèles qui reviennent ; nombre de réclamations.",
    source: "p.48",
  },

  // ══════════════════════════════════════════
  //  OUTILS & MÉTHODES
  // ══════════════════════════════════════════
  cartographie: {
    title: "Cartographie des processus",
    category: "outil",
    isoRef: "§4.4",
    definition:
      "Représentation graphique d'un ensemble de processus de l'organisme. Elle donne la représentation de la dynamique du système qualité et permet de visualiser les interactions entre processus de management, de réalisation et de support.",
    example:
      "Cartographie typique avec 3 niveaux : processus de management (gouvernance, stratégie, pilotage), processus opérationnels (réalisation du produit/service), processus support (RH, achats, SI).",
    source: "p.11 & p.45-46",
  },

  tableau_bord: {
    title: "Tableau de bord",
    category: "outil",
    isoRef: "§9.1.3",
    definition:
      "Outil de visualisation, d'analyse, de décision d'amélioration et d'évaluation de la performance du processus. Le tableau de bord est également l'outil de communication vis-à-vis de la direction et des acteurs, des clients et parties intéressées pertinentes.",
    details: [
      "Consolidation des objectifs et résultats de mesures",
      "Visualisation de la performance",
      "Analyse pour la prise de décision",
      "Communication avec toutes les parties prenantes",
    ],
    source: "p.29",
  },

  smart: {
    title: "Indicateurs SMART",
    category: "outil",
    definition:
      "Les indicateurs doivent respecter les critères SMART pour être efficaces et permettre une évaluation précise des objectifs. L'utilité d'un indicateur SMART résulte de la précision de l'objectif fixé.",
    details: [
      "Spécifique — En lien direct avec le travail de la personne, simple à comprendre, clair et précis, compréhensible par tous",
      "Mesurable — Quantifié ou qualifié, avec un seuil défini pour savoir le niveau à atteindre",
      "Atteignable — Raisonnable mais suffisamment ambitieux pour représenter un défi motivant",
      "Réaliste — Le seuil du réalisme est défini pour motiver le plus grand nombre sans provoquer l'abandon",
      "Temporellement défini — Délimité dans le temps avec une date butoir et des dates intermédiaires précises",
    ],
    source: "p.42-44",
  },

  document: {
    title: "Information documentée",
    category: "outil",
    isoRef: "§7.5",
    definition:
      "Les informations documentées d'un processus se regroupent dans une fiche d'identité (éléments descriptifs) et un carnet de santé (éléments de pilotage).",
    details: [
      "Caractéristiques du processus (fiche d'identité)",
      "Description du déroulement des activités sous forme de logigramme",
      "Points de vigilance et points de contrôle",
      "Tableau de bord et plan d'actions (carnet de santé)",
      "Documents de référence : procédures, modes opératoires, consignes",
    ],
    source: "p.26",
  },

  logigramme: {
    title: "Logigramme",
    category: "outil",
    definition:
      "Représentation graphique du déroulement des activités qui composent un processus. Le logigramme présente les actions et la fonction des acteurs qui les réalisent, les points de vigilance et les points de contrôle.",
    source: "p.26",
  },

  fiche_identite: {
    title: "Fiche d'identité du processus",
    category: "outil",
    definition:
      "Document regroupant les éléments descriptifs d'un processus : titre, finalité, clients, périmètre, données d'entrée/sortie, séquence, acteurs, ressources, interactions et documents de référence.",
    source: "p.26 & p.49",
  },

  export_pdf: {
    title: "Export PDF – Fiche processus",
    category: "outil",
    definition:
      "Génère un document PDF complet de la fiche d'identité du processus conforme à la norme ISO 9001. Le PDF inclut les éléments descriptifs, le logigramme BPMN, les indicateurs, les risques/opportunités, les enjeux de contexte et les interactions.",
    details: [
      "Présentation et mise en page conçues par Radja BENHAMIDA",
      "Format A4 avec en-tête incluant les logos Entreprise et Marque",
      "Intégration automatique du diagramme BPMN si activé",
    ],
    source: "Application BPM Compass",
  },

  carnet_sante: {
    title: "Carnet de santé du processus",
    category: "outil",
    definition:
      "Document regroupant les éléments de pilotage du processus : tableau de bord, plan d'actions, comptes rendus de revue, rapports d'audit, mesure de maturité et historique des modifications.",
    source: "p.27",
  },

  // ══════════════════════════════════════════
  //  PILOTAGE & STRATÉGIE
  // ══════════════════════════════════════════
  pilotage_processus: {
    title: "Pilotage des processus",
    category: "pilotage",
    definition:
      "Démarche organisationnelle assurée par la personne en charge du pilotage de chacun des processus. Elle consiste à analyser les processus, identifier les objectifs, déterminer des indicateurs, définir les actions d'amélioration et s'assurer du résultat.",
    details: [
      "Analyser les processus",
      "Identifier les objectifs à atteindre",
      "Déterminer des indicateurs",
      "Définir les actions à conduire pour améliorer ou transformer",
      "Conduire les actions et s'assurer du résultat",
    ],
    source: "p.19-20",
  },

  management_processus: {
    title: "Management par les processus",
    category: "pilotage",
    isoRef: "§4.4",
    definition:
      "Décision stratégique de la direction de l'organisme qui consiste à remettre clairement le client au centre des préoccupations en confiant à des acteurs compétents, les pilotes de processus, une responsabilité transversale.",
    details: [
      "Modifier l'organisation de l'organisme (rôle des pilotes, des hiérarchiques, des équipes projets)",
      "Mettre en place une gouvernance processus",
      "Insuffler à tous les acteurs une culture coopérative et client",
      "Mettre en place un système de pérennisation de la démarche",
      "Assurer un suivi de la maturité",
    ],
    source: "p.31-32",
  },

  processus_cles: {
    title: "Processus clés",
    category: "pilotage",
    definition:
      "Processus les plus significatifs pour l'organisme. Leur sélection est à réviser périodiquement à partir des évolutions de la politique, des performances et de l'environnement.",
    details: [
      "Atteinte des objectifs stratégiques de la direction",
      "Contribution au chiffre d'affaires et aux résultats opérationnels",
      "Satisfaction du client et des autres parties intéressées",
      "Performance durable de l'organisme",
      "Maîtrise des risques et opportunités, notamment au niveau des interactions",
    ],
    source: "p.33-34",
  },

  objectifs_processus: {
    title: "Objectifs du processus",
    category: "pilotage",
    isoRef: "§6.2",
    definition:
      "La détermination des objectifs du processus est assurée par la personne en charge du pilotage. Ces objectifs prennent en compte les objectifs stratégiques de l'organisme et les objectifs individuels de chaque entité concernée par le processus.",
    source: "p.28",
  },

  risques_opportunites: {
    title: "Risques & Opportunités",
    category: "pilotage",
    isoRef: "§6.1",
    definition:
      "Points qui nécessitent une attention particulière dans le cadre du processus. Ils font partie des éléments de gouvernance et doivent être identifiés, évalués et surveillés.",
    details: [
      "Moments de vérité clients — interactions critiques avec le client",
      "Environnement de travail — conditions pouvant affecter la qualité",
      "Risques opérationnels — dysfonctionnements pouvant compromettre le processus",
      "Risques financiers — impacts sur les coûts et la rentabilité",
      "Risques médiatiques — impacts sur l'image de l'organisme",
      "Risques juridiques — non-conformité aux exigences légales et réglementaires",
    ],
    source: "p.25 & p.50",
  },

  revue_processus: {
    title: "Revue de processus",
    category: "pilotage",
    isoRef: "§9.3",
    definition:
      "Dispositif concret (qui, quoi, comment, quand…) permettant de piloter le processus et de maîtriser efficacement son fonctionnement. Le pilote réalise une revue de processus périodiquement pour s'assurer de son efficacité.",
    details: [
      "Analyse des indicateurs du tableau de bord",
      "Évaluation de l'atteinte des objectifs",
      "Identification des actions d'amélioration",
      "Mesure du niveau de maturité du processus",
    ],
    source: "p.25 & p.35",
  },

  revue_direction: {
    title: "Revue de direction",
    category: "pilotage",
    isoRef: "§9.3",
    definition:
      "Comptes rendus de pilotage stratégique, exploitation des résultats en vue de l'amélioration. La revue de direction fait partie des éléments de pilotage documentés du processus.",
    details: [
      "Tableau de bord du processus et plan d'actions",
      "Comptes rendus de revue de processus",
      "Rapports d'audit et actions d'amélioration consécutives",
      "Mesure du niveau de maturité",
      "Historique des modifications",
    ],
    source: "p.27",
  },

  politique_qualite: {
    title: "Politique qualité",
    category: "pilotage",
    isoRef: "§5.2",
    definition:
      "Détermination de la politique et déploiement des objectifs dans l'organisme. Elle fait partie des processus de management et assure la cohérence entre les processus de réalisation et de support.",
    source: "p.7",
  },

  enjeux_contexte: {
    title: "Enjeux du contexte",
    category: "pilotage",
    isoRef: "§4.1",
    definition:
      "Facteurs internes et externes influençant la stratégie et les objectifs de l'organisme. L'organisme doit déterminer les enjeux pertinents qui affectent sa capacité à atteindre les résultats attendus de son système de management de la qualité.",
    source: "Norme ISO 9001:2015, §4.1",
  },

  maturite: {
    title: "Maturité du processus",
    category: "pilotage",
    definition:
      "Niveau d'avancement et de performance d'un processus. La mesure du niveau de maturité fait partie des éléments de pilotage et permet d'évaluer la progression dans la maîtrise et l'amélioration continue du processus.",
    source: "p.27 & p.32",
  },

  gouvernance_processus: {
    title: "Gouvernance processus",
    category: "pilotage",
    definition:
      "Éléments de gouvernance du processus comprenant : la personne ou l'instance en charge du pilotage, les objectifs et indicateurs, les modalités de pilotage (revue de processus, analyse des indicateurs) et les risques et opportunités.",
    source: "p.25",
  },

  ressources: {
    title: "Ressources du processus",
    category: "pilotage",
    isoRef: "§7.1",
    definition:
      "Ressources spécifiques indispensables à la réalisation du processus : matérielles (locaux, équipements), informationnelles (connaissances organisationnelles, système d'information) ou humaines (acteurs, services, experts).",
    source: "p.24 & p.50",
  },

  evaluation_processus: {
    title: "Évaluation du processus",
    category: "pilotage",
    definition:
      "Analyse de la contribution des processus selon des critères stratégiques. Les processus clés sont ceux auxquels les pilotes s'intéresseront en priorité. L'identification est à réviser périodiquement.",
    details: [
      "Atteinte des objectifs stratégiques",
      "Contribution au chiffre d'affaires",
      "Impact sur la satisfaction client",
      "Importance pour la pérennité de l'organisme",
      "Maîtrise des risques et opportunités",
    ],
    source: "p.33-34",
  },

  // ══════════════════════════════════════════
  //  AUDIT & AMÉLIORATION
  // ══════════════════════════════════════════
  non_conformite: {
    title: "Non-conformité",
    category: "audit",
    isoRef: "§10.2",
    definition:
      "Écart par rapport aux exigences définies nécessitant une action corrective. La non-conformité est détectée lors d'un audit, d'une revue ou du fonctionnement courant du processus, et doit être traitée pour empêcher sa récurrence.",
    details: [
      "Identification et enregistrement de l'écart",
      "Analyse de la cause racine",
      "Mise en place d'actions correctives",
      "Vérification de l'efficacité des actions",
    ],
    source: "Norme ISO 9001:2015",
  },

  audit: {
    title: "Audit",
    category: "audit",
    isoRef: "§9.2",
    definition:
      "L'auditeur aide à évaluer l'efficacité et l'efficience du système de management. L'audit permet de vérifier la conformité des pratiques par rapport aux exigences définies et d'identifier des opportunités d'amélioration.",
    details: [
      "Planification et programmation des audits",
      "Vérification de la conformité des pratiques",
      "Identification des constats et écarts",
      "Recommandation d'actions d'amélioration",
    ],
    source: "p.17",
  },

  action_amelioration: {
    title: "Action d'amélioration",
    category: "audit",
    isoRef: "§10.1",
    definition:
      "Action décidée suite à l'analyse des indicateurs, des audits ou des revues, visant à améliorer la performance du processus. Les actions issues du plan d'amélioration découlent du tableau de bord du processus.",
    details: [
      "Comptes rendus de revue de direction et de revue de processus",
      "Rapports d'audit et actions consécutives",
      "Mesure du niveau de maturité du processus",
      "Historique des modifications",
    ],
    source: "p.27",
  },

  action_corrective: {
    title: "Action corrective",
    category: "audit",
    isoRef: "§10.2",
    definition:
      "Action entreprise pour éliminer la cause d'une non-conformité détectée et empêcher sa récurrence. L'action corrective fait partie du processus d'amélioration continue et nécessite une analyse de la cause racine.",
    source: "Norme ISO 9001:2015, §10.2",
  },

  action_preventive: {
    title: "Action préventive",
    category: "audit",
    definition:
      "Action entreprise pour éliminer la cause d'une non-conformité potentielle. Elle vise à empêcher l'apparition de dysfonctionnements en agissant sur les risques identifiés avant qu'ils ne se concrétisent.",
    source: "Approche par les risques, §6.1",
  },

  amelioration_continue: {
    title: "Amélioration continue",
    category: "audit",
    isoRef: "§10.3",
    definition:
      "Activité récurrente menée pour améliorer les performances. L'approche processus vise une dynamique d'amélioration permanente ou de transformation des processus. Les améliorations résultant des changements sont mesurables et mesurées.",
    source: "p.15",
  },

  incident: {
    title: "Incident",
    category: "audit",
    definition:
      "Événement indésirable lié à un risque ou à un processus nécessitant un traitement. Les incidents sont enregistrés, analysés et des actions correctives sont mises en place pour prévenir leur récurrence.",
    source: "Approche par les risques, §6.1",
  },

  // ══════════════════════════════════════════
  //  ÉLÉMENTS DESCRIPTIFS & STRUCTURANTS
  // ══════════════════════════════════════════
  elements_structurants: {
    title: "Éléments structurants",
    category: "concept",
    definition:
      "Caractéristiques fondamentales qui définissent un processus. Ils doivent être identifiés et mis à jour au fur et à mesure.",
    details: [
      "Clients (internes et externes) et parties intéressées pertinentes",
      "Éléments de sortie (production du processus)",
      "Périmètre du processus",
      "Finalité (raison d'être du processus)",
      "Données d'entrée et éléments déclencheurs",
      "Titre présentant l'utilité du processus",
    ],
    source: "p.23",
  },

  elements_descriptifs: {
    title: "Éléments descriptifs",
    category: "concept",
    definition:
      "Caractéristiques détaillées décrivant le fonctionnement interne du processus.",
    details: [
      "Séquence — identification des différentes étapes clés",
      "Acteurs (internes et externes) et leurs rôles",
      "Ressources spécifiques (matérielles, informationnelles, humaines)",
      "Interactions avec les autres processus et leur contenu",
      "Documents de référence (procédures, modes opératoires, consignes)",
    ],
    source: "p.24",
  },

  elements_gouvernance: {
    title: "Éléments de gouvernance",
    category: "concept",
    definition:
      "Dispositifs permettant de piloter et surveiller le processus. Ils constituent le cadre de pilotage du processus.",
    details: [
      "Personne ou instance en charge du pilotage",
      "Objectifs et indicateurs de résultat et de fonctionnement",
      "Modalités de pilotage (revue de processus, analyse des indicateurs…)",
      "Risques et opportunités nécessitant une attention particulière",
    ],
    source: "p.25",
  },

  elements_pilotage: {
    title: "Éléments de pilotage",
    category: "pilotage",
    definition:
      "Données documentées permettant le suivi et l'amélioration du processus. Ils constituent le « carnet de santé » du processus.",
    details: [
      "Tableau de bord du processus et plan d'actions",
      "Comptes rendus de revue de direction et de revue de processus",
      "Rapports d'audit et actions d'amélioration consécutives",
      "Mesure du niveau de maturité du processus",
      "Historique des modifications",
    ],
    source: "p.27",
  },

  conduite_changement: {
    title: "Conduite du changement",
    category: "pilotage",
    definition:
      "En mettant en place une approche processus, le changement touche l'organisation, les fonctionnements, les rôles et missions, les interactions. Il impacte différentes populations à des degrés divers et implique des modifications de comportement et des actions à accomplir.",
    source: "p.36",
  },

  bpmn: {
    title: "BPMN (Business Process Model and Notation)",
    category: "outil",
    definition:
      "Notation standard internationale pour la modélisation des processus métier sous forme de diagrammes de flux. Elle permet de représenter graphiquement le déroulement des activités, les décisions, les événements et les interactions entre acteurs.",
    source: "Norme BPMN 2.0",
  },
};
