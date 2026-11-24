export type JobSource = {
  id: string;
  label: string;
  domain: string;
  description: string;
  defaultEnabled: boolean;
};

export const JOB_SOURCES: JobSource[] = [
  {
    id: "indeed",
    label: "Indeed",
    domain: "fr.indeed.com",
    description: "Le plus grand agrégateur d'offres en France.",
    defaultEnabled: true,
  },
  {
    id: "wttj",
    label: "Welcome to the Jungle",
    domain: "welcometothejungle.com",
    description: "Startups, scale-ups et culture d'entreprise.",
    defaultEnabled: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn Jobs",
    domain: "linkedin.com/jobs",
    description: "Réseau professionnel, offres cadres et tech.",
    defaultEnabled: true,
  },
  {
    id: "francetravail",
    label: "France Travail",
    domain: "candidat.francetravail.fr",
    description: "Service public de l'emploi.",
    defaultEnabled: true,
  },
  {
    id: "apec",
    label: "APEC",
    domain: "apec.fr",
    description: "Offres cadres et jeunes diplômés.",
    defaultEnabled: false,
  },
  {
    id: "hellowork",
    label: "HelloWork",
    domain: "hellowork.com",
    description: "Offres généralistes tous secteurs.",
    defaultEnabled: false,
  },
  {
    id: "careers",
    label: "Sites carrière entreprises",
    domain: "",
    description: "Pages carrières officielles (greenhouse, lever, workday...).",
    defaultEnabled: false,
  },
];

export const DEFAULT_SOURCES = JOB_SOURCES.filter((s) => s.defaultEnabled).map((s) => s.id);

export const AI_MODELS = [
  {
    id: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    hint: "Rapide et équilibré — recommandé",
  },
  { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash", hint: "Dernière génération rapide" },
  {
    id: "google/gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    hint: "Le plus économique",
  },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Raisonnement approfondi" },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    hint: "Analyse la plus fine (preview)",
  },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", hint: "Bon rapport qualité/coût" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", hint: "Analyse experte" },
  { id: "openai/gpt-5.5", label: "GPT-5.5", hint: "Le plus capable" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", hint: "Ultra rapide et économique" },
  { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna", hint: "Nouvelle génération rapide" },
] as const;

export const CONTRACT_TYPES = ["CDI", "CDD", "Alternance", "Stage", "Freelance", "Intérim"];
export const REMOTE_OPTIONS = [
  { id: "any", label: "Peu importe" },
  { id: "onsite", label: "Sur site" },
  { id: "hybrid", label: "Hybride" },
  { id: "remote", label: "100% télétravail" },
];

export const OFFER_STATUSES = [
  { id: "new", label: "Nouvelle" },
  { id: "shortlist", label: "Présélection" },
  { id: "applied", label: "Candidature envoyée" },
  { id: "interview", label: "Entretien" },
  { id: "rejected", label: "Refusée" },
  { id: "archived", label: "Archivée" },
];

export const SECTORS = [
  "Informatique / Numérique",
  "BTP / Construction",
  "Commerce / Vente",
  "Hôtellerie / Restauration",
  "Santé / Social",
  "Transport / Logistique",
  "Industrie / Maintenance",
  "Banque / Assurance",
  "Comptabilité / Gestion",
  "Marketing / Communication",
  "Ressources humaines",
  "Éducation / Formation",
  "Tourisme / Loisirs",
  "Agriculture / Agroalimentaire",
  "Énergie / Environnement",
  "Juridique",
  "Immobilier",
  "Fonction publique",
];

export const FLEXIBILITY_OPTIONS = [
  { id: "strict", label: "Strict", hint: "Uniquement le poste exact" },
  { id: "balanced", label: "Équilibré", hint: "Poste + métiers proches" },
  { id: "large", label: "Large", hint: "Tout le secteur d'activité" },
];

export const FRESHNESS_OPTIONS = [
  { id: "any", label: "Peu importe" },
  { id: "week", label: "7 derniers jours" },
  { id: "month", label: "30 derniers jours" },
];

export const REUNION_LOCATIONS = [
  "Saint-Denis",
  "Saint-Paul",
  "Saint-Pierre",
  "Le Tampon",
  "Saint-André",
  "Saint-Louis",
  "Le Port",
  "Sainte-Marie",
  "Saint-Benoît",
  "Saint-Leu",
];
