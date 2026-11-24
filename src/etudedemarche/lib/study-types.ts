export type AiModel = {
  id: string;
  label: string;
  description: string;
  tier: "rapide" | "équilibré" | "puissant";
};

export const AI_MODELS: AiModel[] = [
  {
    id: "google/gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    description: "Recommandé — excellent rapport vitesse / profondeur d'analyse.",
    tier: "équilibré",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Raisonnement long et contexte massif pour études complexes.",
    tier: "puissant",
  },
  {
    id: "google/gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    description: "Très économique, idéal pour les études courtes.",
    tier: "rapide",
  },
  {
    id: "openai/gpt-5-nano",
    label: "GPT-5 Nano",
    description: "Ultra rapide et économique pour les études simples.",
    tier: "rapide",
  },
  {
    id: "openai/gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    description: "Rapide et peu coûteux, nouvelle génération OpenAI.",
    tier: "rapide",
  },
  {
    id: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
    description: "Bon équilibre coût / qualité de rédaction.",
    tier: "équilibré",
  },
  {
    id: "openai/gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    description: "Polyvalent, très bonne qualité rédactionnelle.",
    tier: "équilibré",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    description: "Maximum de rigueur analytique pour dossiers officiels.",
    tier: "puissant",
  },
];

export const DEPTH_OPTIONS = [
  { id: "express", label: "Express", description: "Synthèse rapide, 6 sections clés." },
  { id: "standard", label: "Standard", description: "Étude complète prête à présenter." },
  { id: "approfondi", label: "Approfondi", description: "Dossier exhaustif type organisme officiel." },
] as const;

export type StudyStatus = "draft" | "analyzing" | "analyzed" | "researching" | "completed" | "failed";

export type StudyAnalysis = {
  reformulation: string;
  secteur: string;
  zone_geographique: string;
  cible: string;
  objectifs: string[];
  hypotheses: string[];
  questions_cles: string[];
  plan_de_recherche: { etape: string; objectif: string; sources: string[] }[];
  risques: string[];
  titre_suggere: string;
};

export type ReportSection = {
  titre: string;
  contenu: string;
  points_cles: string[];
};

export type StudyReport = {
  titre: string;
  sous_titre: string;
  resume_executif: string;
  sections: ReportSection[];
  taille_marche: { indicateur: string; valeur: string; commentaire: string }[];
  concurrents: { nom: string; positionnement: string; forces: string; faiblesses: string }[];
  segments: { nom: string; description: string; poids_estime: string }[];
  swot: { forces: string[]; faiblesses: string[]; opportunites: string[]; menaces: string[] };
  prix: { modele: string; fourchette: string; justification: string }[];
  recommandations: string[];
  plan_action: { horizon: string; action: string; indicateur: string }[];
  risques: { risque: string; impact: string; mitigation: string }[];
  sources: { titre: string; origine: string; fiabilite: string }[];
  methodologie: string;
  limites: string;
};

export type StudyLog = { at: string; label: string; detail?: string };

export type StudyRow = {
  id: string;
  user_id: string;
  title: string;
  brief: string;
  status: StudyStatus;
  progress: number;
  model: string;
  analysis: StudyAnalysis | null;
  report: StudyReport | null;
  logs: StudyLog[];
  error: string | null;
  created_at: string;
  updated_at: string;
};