export type SectionKey =
  | "developpement"
  | "investissement"
  | "financement"
  | "chiffre-affaires"
  | "compte-resultat"
  | "tresorerie"
  | "bfr"
  | "seuil-rentabilite"
  | "capacite-remboursement"
  | "scenarios"
  | "risques"
  | "demande-bancaire";

export type SectionDef = {
  key: SectionKey;
  index: number;
  title: string;
  short: string;
  description: string;
  brief: string;
};

export const SECTIONS: SectionDef[] = [
  {
    key: "developpement",
    index: 1,
    title: "Plan de développement à 3 ans",
    short: "Développement",
    description: "Trajectoire stratégique, jalons et moyens sur 36 mois.",
    brief:
      "Décris la trajectoire année 1 / 2 / 3 : positionnement, offre, cibles, canaux d'acquisition, effectifs, jalons trimestriels, indicateurs de pilotage. Tableau des jalons par année avec objectifs chiffrés (clients, CA, effectif, implantation).",
  },
  {
    key: "investissement",
    index: 2,
    title: "Budget d'investissement initial",
    short: "Investissements",
    description: "Immobilisations, amortissements et coûts de démarrage.",
    brief:
      "Liste détaillée des immobilisations incorporelles, corporelles et financières + frais d'établissement, avec montants HT, durée et mode d'amortissement, et total. Ajoute une ligne de trésorerie de démarrage.",
  },
  {
    key: "financement",
    index: 3,
    title: "Plan de financement",
    short: "Financement",
    description: "Ressources durables face aux besoins, sur 3 ans.",
    brief:
      "Plan de financement initial ET sur 3 ans : besoins (investissements, BFR, remboursements) vs ressources (apports, comptes courants, subventions, prêt d'honneur, emprunt bancaire). Vérifie l'équilibre besoins = ressources et calcule le ratio fonds propres / total.",
  },
  {
    key: "chiffre-affaires",
    index: 4,
    title: "Prévisionnel de chiffre d'affaires",
    short: "Chiffre d'affaires",
    description: "Construction du CA par ligne de produit et par mois.",
    brief:
      "Construis le CA par la méthode volume x prix, par ligne de revenu, mois par mois pour l'année 1 (saisonnalité explicite) puis en synthèse annuelle pour N+1 et N+2. Justifie chaque hypothèse (capacité, taux de remplissage, panier moyen, cycle de vente).",
  },
  {
    key: "compte-resultat",
    index: 5,
    title: "Compte de résultat prévisionnel",
    short: "Compte de résultat",
    description: "Soldes intermédiaires de gestion sur 3 exercices.",
    brief:
      "Compte de résultat sur 3 exercices : CA, achats consommés, marge brute, charges externes détaillées, masse salariale chargée, impôts et taxes, EBE, dotations aux amortissements, résultat d'exploitation, charges financières, résultat avant impôt, IS, résultat net. Ajoute les taux de marge.",
  },
  {
    key: "tresorerie",
    index: 6,
    title: "Plan de trésorerie",
    short: "Trésorerie",
    description: "Encaissements / décaissements mois par mois.",
    brief:
      "Plan de trésorerie mensuel sur 12 mois (TTC) : solde initial, encaissements (ventes selon délais de règlement, apports, emprunt, subventions), décaissements (achats, salaires, charges sociales, loyer, TVA, échéances d'emprunt, investissements), solde du mois et solde cumulé. Identifie le point bas et le mois de croisement.",
  },
  {
    key: "bfr",
    index: 7,
    title: "Besoin en fonds de roulement",
    short: "BFR",
    description: "Stocks, créances, dettes et BFR normatif.",
    brief:
      "Calcule le BFR normatif en jours de CA HT : stocks, créances clients (délai de règlement), TVA déductible moins dettes fournisseurs, dettes sociales et fiscales. Donne le BFR en euros pour chaque exercice et la variation de BFR.",
  },
  {
    key: "seuil-rentabilite",
    index: 8,
    title: "Seuil de rentabilité",
    short: "Seuil de rentabilité",
    description: "Point mort, marge de sécurité et levier opérationnel.",
    brief:
      "Sépare charges fixes et charges variables, calcule le taux de marge sur coûts variables, le seuil de rentabilité en euros, en volume, le point mort en jours/mois, la marge de sécurité et le levier opérationnel, pour les 3 exercices.",
  },
  {
    key: "capacite-remboursement",
    index: 9,
    title: "Capacité de remboursement",
    short: "Remboursement",
    description: "CAF, annuités et ratios prudentiels bancaires.",
    brief:
      "Calcule la CAF (résultat net + dotations), l'annuité d'emprunt, le ratio CAF / annuités (couverture), le ratio d'endettement (dettes financières / fonds propres), le ratio dettes / CAF et le tableau d'amortissement de l'emprunt. Commente au regard des standards bancaires (couverture > 1,3, endettement < 1).",
  },
  {
    key: "scenarios",
    index: 10,
    title: "Simulations de scénarios",
    short: "Scénarios",
    description: "Pessimiste, réaliste, optimiste et sensibilités.",
    brief:
      "Trois scénarios (pessimiste -30% CA, réaliste, optimiste +25% CA) avec CA, EBE, résultat net, trésorerie mini et point mort. Ajoute une analyse de sensibilité sur le prix de vente, le volume et le coût d'achat (+/- 10%).",
  },
  {
    key: "risques",
    index: 11,
    title: "Risques et mesures de maîtrise",
    short: "Risques",
    description: "Cartographie des risques et plans d'action.",
    brief:
      "Cartographie des risques (marché, opérationnel, financier, réglementaire, humain, cyber) avec probabilité, impact, criticité, mesures de prévention, plan de repli et indicateur d'alerte.",
  },
  {
    key: "demande-bancaire",
    index: 12,
    title: "Demande de financement bancaire",
    short: "Dossier bancaire",
    description: "Note de synthèse prête pour le banquier.",
    brief:
      "Note de synthèse bancaire : présentation du porteur et du projet, montant sollicité, objet du financement, durée, garanties proposées, plan de financement récapitulatif, principaux ratios, arguments de solidité et conclusion. Termine par une lettre d'accompagnement formelle.",
  },
];

export const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.key, s])) as Record<
  SectionKey,
  SectionDef
>;

export type KPI = { label: string; value: string; hint?: string; trend?: "up" | "down" | "flat" };
export type PlanTable = { title: string; columns: string[]; rows: string[][]; note?: string };

export type SectionContent = {
  summary?: string;
  kpis?: KPI[];
  tables?: PlanTable[];
  narrative?: string;
  assumptions?: string[];
  recommendations?: string[];
  chart?: { type: "bar" | "line"; title: string; labels: string[]; series: { name: string; data: number[] }[] };
};

export const AI_MODELS = [
  {
    id: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    vendor: "Google",
    hint: "Équilibre idéal vitesse / profondeur. Recommandé par défaut.",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    vendor: "Google",
    hint: "Raisonnement le plus poussé pour les modèles financiers complexes.",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    vendor: "Google",
    hint: "Ultra rapide et économique pour les itérations de chat.",
  },
  {
    id: "openai/gpt-5-nano",
    label: "GPT-5 Nano",
    vendor: "OpenAI",
    hint: "Très rapide et économique, idéal pour les ajustements simples.",
  },
  {
    id: "openai/gpt-5.6-luna",
    label: "GPT-5 Luna",
    vendor: "OpenAI",
    hint: "Rapide et peu coûteux, excellent pour les volumes élevés.",
  },
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    vendor: "OpenAI",
    hint: "Analyse avancée, très bon sur les tableaux financiers.",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    vendor: "OpenAI",
    hint: "Le plus capable : dossiers bancaires exigeants.",
  },
] as const;

export const DEFAULT_MODEL = "google/gemini-3.5-flash";
