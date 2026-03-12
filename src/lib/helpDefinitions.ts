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
    source: "Formation Management des Processus, p.10 & p.22",
  },

  activite: {
    title: "Activité",
    category: "concept",
    definition:
      "Ensemble de tâches corrélées constituant une étape de transformation au sein d'un processus. Chaque activité consomme des ressources et produit des éléments qui alimentent l'étape suivante.",
    source: "Formation Management des Processus, p.10",
  },

  client_processus: {
    title: "Client du processus",
    category: "concept",
    definition:
      "Bénéficiaire du résultat du processus. Le client peut être interne (un autre service, un autre processus) ou externe (le client final de l'organisme). L'approche processus place le client au cœur du fonctionnement de l'organisme.",
    source: "Formation Management des Processus, p.10",
  },

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
    source: "Formation Management des Processus, p.11 & p.35",
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
      "Contributeurs : contribuer à l'amélioration et au pilotage",
      "Auditeurs : comprendre la vision processus et ses apports",
    ],
    source: "Formation Management des Processus, p.11 & p.36",
  },

  cartographie: {
    title: "Cartographie des processus",
    category: "outil",
    isoRef: "§4.4",
    definition:
      "Représentation graphique d'un ensemble de processus de l'organisme. Elle donne la représentation de la dynamique du système qualité et permet de visualiser les interactions entre processus de management, de réalisation et de support.",
    example:
      "Cartographie typique avec 3 niveaux : processus de management (gouvernance, stratégie, pilotage), processus opérationnels (réalisation du produit/service), processus support (RH, achats, SI).",
    source: "Formation Management des Processus, p.11 & p.45-46",
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
    ],
    source: "Formation Management des Processus, p.12-15 & p.18-19",
  },

  interaction: {
    title: "Interaction entre processus",
    category: "concept",
    definition:
      "Action d'un processus sur un ou plusieurs autres processus. Il peut être utile de « contractualiser » les conditions des échanges d'éléments entre processus et d'associer des indicateurs à la tenue des engagements réciproques.",
    source: "Formation Management des Processus, p.12 & p.24",
  },

  interface: {
    title: "Interface entre processus",
    category: "concept",
    definition:
      "Limite commune à deux processus où s'effectuent des échanges. La maîtrise des interfaces est améliorée par une meilleure compréhension des besoins et contraintes, une communication efficace entre les acteurs, et une définition claire des circuits d'informations et de prises de décisions.",
    source: "Formation Management des Processus, p.12 & p.15",
  },

  processus_management: {
    title: "Processus de management",
    category: "concept",
    isoRef: "§5",
    definition:
      "Ils comprennent la détermination de la politique, le déploiement des objectifs dans l'organisme, l'allocation des ressources. Ils assurent la cohérence des processus de réalisation et de support. Ils incluent la mesure et la surveillance du système de processus et l'exploitation des résultats en vue de l'amélioration des performances.",
    source: "Formation Management des Processus, p.7",
  },

  processus_realisation: {
    title: "Processus de réalisation",
    category: "concept",
    isoRef: "§8",
    definition:
      "Ils contribuent directement à la réalisation du produit, de la détection du besoin du client à sa satisfaction. Ils regroupent les activités liées au cycle de réalisation du produit.",
    source: "Formation Management des Processus, p.8",
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
    source: "Formation Management des Processus, p.9",
  },

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
    source: "Formation Management des Processus, p.29 & p.41",
  },

  indicateur_activite: {
    title: "Indicateur d'activité",
    category: "indicateur",
    definition:
      "Ils renseignent sur les quantités réalisées, les quantités consommées, l'activité générée. Ils permettent d'ajuster les ressources du processus aux fluctuations d'activité.",
    example:
      "Temps d'attente du client entre son arrivée et la prise de commande ; temps moyen de passage d'un client entre son arrivée et son départ.",
    source: "Formation Management des Processus, p.38 & p.48",
  },

  indicateur_resultat: {
    title: "Indicateur de résultat",
    category: "indicateur",
    definition:
      "Ils renseignent sur l'atteinte des objectifs du processus et sur la conformité du produit ou du service. Les objectifs du processus peuvent être identifiés en se posant les questions suivantes :",
    details: [
      "Qu'est-ce que je veux garantir en terme de coût du produit ou du processus ?",
      "Comment je m'assure de la conformité du produit ou du service ?",
      "Qu'est-ce que je veux garantir en terme de respect des délais et de réactivité ?",
    ],
    example:
      "Taux de perte sur les produits d'entrée ; nombre de couverts servis ; prix moyen d'un couvert ; marge brute par couvert.",
    source: "Formation Management des Processus, p.39 & p.48",
  },

  indicateur_perception: {
    title: "Indicateur de perception",
    category: "indicateur",
    definition:
      "Ils renseignent sur la perception qu'ont les clients et les autres parties prenantes du processus. Ils permettent de mesurer le ressenti et la satisfaction.",
    example:
      "Évaluation laissée par le client sur le livre d'or ; notes et avis sur internet ; pourcentage de clients fidèles ; nombre de plats renvoyés en cuisine.",
    source: "Formation Management des Processus, p.40 & p.48",
  },

  indicateur_interne: {
    title: "Indicateur interne du processus",
    category: "indicateur",
    definition:
      "Ils renseignent sur le déroulement et le fonctionnement du processus et permettent au pilote de prendre des décisions qui auront un impact sur le résultat lorsqu'il est encore temps. Ils ont un caractère prédictif d'une situation désirée ou non-désirée.",
    example:
      "L'indicateur n'est pas nécessairement une valeur mesurée : il peut consister à observer l'apparition d'un événement qui alerte le pilote (ex : le voyant de la jauge d'essence sur une voiture).",
    source: "Formation Management des Processus, p.41",
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
    source: "Formation Management des Processus, p.29",
  },

  smart: {
    title: "Indicateurs SMART",
    category: "outil",
    definition:
      "Les indicateurs doivent respecter les critères SMART pour être efficaces et permettre une évaluation précise des objectifs.",
    details: [
      "Spécifique — En lien direct avec le travail de la personne, simple à comprendre, clair et précis",
      "Mesurable — Quantifié ou qualifié, avec un seuil défini pour savoir le niveau à atteindre",
      "Atteignable — Raisonnable mais suffisamment ambitieux pour représenter un défi motivant",
      "Réaliste — Le seuil du réalisme est défini pour motiver le plus grand nombre sans provoquer l'abandon",
      "Temporellement défini — Délimité dans le temps avec une date butoir et des dates intermédiaires précises",
    ],
    source: "Formation Management des Processus, p.42-44",
  },

  donnees_entree: {
    title: "Données d'entrée",
    category: "concept",
    isoRef: "§4.4",
    definition:
      "Éléments déclenchant la mise en œuvre du processus. Les données d'entrée doivent être identifiées en indiquant notamment celles qui déclenchent le démarrage du processus.",
    example: "Demande client, commande, matières premières, informations transmises par un autre processus.",
    source: "Formation Management des Processus, p.23",
  },

  donnees_sortie: {
    title: "Données de sortie",
    category: "concept",
    isoRef: "§4.4",
    definition:
      "Éléments de sortie qui concrétisent la « production » du processus de produits et/ou de services. Ils représentent le résultat escompté du processus.",
    source: "Formation Management des Processus, p.23",
  },

  risques_opportunites: {
    title: "Risques & Opportunités",
    category: "pilotage",
    isoRef: "§6.1",
    definition:
      "Points qui nécessitent une attention particulière dans le cadre du processus. Ils font partie des éléments de gouvernance et doivent être identifiés, évalués et surveillés.",
    details: [
      "Moments de vérité clients — interactions critiques avec le client",
      "Risques opérationnels — dysfonctionnements pouvant compromettre le processus",
      "Risques financiers — impacts sur les coûts et la rentabilité",
      "Risques médiatiques — impacts sur l'image de l'organisme",
      "Risques juridiques — non-conformité aux exigences légales et réglementaires",
    ],
    source: "Formation Management des Processus, p.25 & p.50",
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
    source: "Formation Management des Processus, p.25 & p.35",
  },

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
    source: "Formation Management des Processus — Norme ISO 9001:2015",
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
    source: "Formation Management des Processus, p.17",
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
    source: "Formation Management des Processus, p.27",
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
    source: "Formation Management des Processus, p.26",
  },

  satisfaction_client: {
    title: "Satisfaction client",
    category: "indicateur",
    isoRef: "§9.1.2",
    definition:
      "Indicateur de perception mesurant le ressenti et la satisfaction des clients et des parties prenantes du processus. Il fait partie des indicateurs essentiels pour évaluer la performance.",
    example:
      "Évaluation laissée par le client sur le livre d'or à sa sortie ; note et avis sur internet (ex : Tripadvisor) ; pourcentage de clients fidèles qui reviennent ; nombre de réclamations.",
    source: "Formation Management des Processus, p.48",
  },

  competences: {
    title: "Compétences & Ressources humaines",
    category: "role",
    isoRef: "§7.2",
    definition:
      "Ressources humaines indispensables à la réalisation des processus. Les acteurs (internes et externes) et leurs rôles doivent être identifiés, ainsi que les ressources spécifiques : matérielles, informationnelles ou humaines (acteurs, services, experts…).",
    source: "Formation Management des Processus, p.24 & p.50",
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
    source: "Formation Management des Processus, p.27",
  },

  politique_qualite: {
    title: "Politique qualité",
    category: "pilotage",
    isoRef: "§5.2",
    definition:
      "Détermination de la politique et déploiement des objectifs dans l'organisme. Elle fait partie des processus de management et assure la cohérence entre les processus de réalisation et de support.",
    source: "Formation Management des Processus, p.7",
  },

  enjeux_contexte: {
    title: "Enjeux du contexte",
    category: "pilotage",
    isoRef: "§4.1",
    definition:
      "Facteurs internes et externes influençant la stratégie et les objectifs de l'organisme. L'organisme doit déterminer les enjeux pertinents qui affectent sa capacité à atteindre les résultats attendus de son système de management de la qualité.",
    source: "Norme ISO 9001:2015, §4.1",
  },

  fournisseur: {
    title: "Fournisseur / Prestataire externe",
    category: "role",
    isoRef: "§8.4",
    definition:
      "Prestataire externe concerné par les interactions des processus. La communication avec les prestataires externes fait partie de la maîtrise des interfaces entre processus.",
    source: "Formation Management des Processus, p.15",
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
    source: "Formation Management des Processus, p.31-32",
  },
};
