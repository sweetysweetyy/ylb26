export type ChartKind = "line" | "bar" | "area" | "pie" | "stackedBar";

export type TableBlock = {
  type: "table";
  title?: string;
  columns: string[];
  rows: (string | number)[][];
  totalRowIndexes?: number[];
  numericFrom?: number;
  unit?: string;
  note?: string;
  source?: string;
};

export type ChartBlock = {
  type: "chart";
  chart: ChartKind;
  title: string;
  xKey: string;
  series: { key: string; label: string }[];
  data: Record<string, string | number>[];
  unit?: string;
  insight?: string;
  source?: string;
};

export type Block =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "kpis"; items: { label: string; value: string; note?: string }[] }
  | { type: "callout"; tone: "info" | "warning" | "success"; title: string; text: string }
  | TableBlock
  | ChartBlock;

export type Section = {
  id: string;
  title: string;
  summary?: string;
  blocks: Block[];
};

export type QualityIssue = {
  severity: "info" | "warning" | "critical";
  area: "donnees" | "mise_en_page" | "coherence" | "completude";
  message: string;
};

export type Quality = {
  score: number;
  issues: QualityIssue[];
  strengths?: string[];
  missing?: string[];
};

export type PlanContent = {
  title: string;
  subtitle?: string;
  company?: string;
  author?: string;
  date?: string;
  currency?: string;
  executiveSummary?: string;
  highlights?: { label: string; value: string; note?: string }[];
  sections: Section[];
  quality?: Quality;
};

export type Brand = {
  primary: string;
  accent: string;
  ink: string;
  surface: string;
  fontDisplay: string;
  fontBody: string;
  logoUrl?: string;
  companyName?: string;
  footerNote?: string;
  cover: "holographique" | "sobre" | "editorial";
};

export const DEFAULT_BRAND: Brand = {
  primary: "#200778",
  accent: "#FFE0C9",
  ink: "#12103A",
  surface: "#FFFFFF",
  fontDisplay: "Space Grotesk",
  fontBody: "Inter",
  cover: "holographique",
};

export const AI_MODELS = [
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", hint: "Équilibré — recommandé" },
  { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash", hint: "Dernière génération, rapide" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Analyse longue et complexe" },
  { id: "openai/gpt-5", label: "GPT-5", hint: "Précision maximale" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini", hint: "Bon compromis coût / qualité" },
  { id: "openai/gpt-5-nano", label: "GPT-5 nano", hint: "Ultra rapide, documents courts" },
  { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna", hint: "Rapide et économique" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra", hint: "Polyvalent" },
  { id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", hint: "Raisonnement le plus poussé" },
] as const;

export function emptyContent(): PlanContent {
  return { title: "Business Plan", sections: [] };
}

export function isPlanContent(value: unknown): value is PlanContent {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as PlanContent).title === "string" &&
    Array.isArray((value as PlanContent).sections) &&
    (value as PlanContent).sections.length > 0 &&
    (value as PlanContent).sections.every(
      (section) =>
        !!section &&
        typeof section === "object" &&
        typeof section.id === "string" &&
        typeof section.title === "string" &&
        Array.isArray(section.blocks),
    )
  );
}
