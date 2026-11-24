import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRow = Record<string, unknown> & {
  full_name?: string | null;
  headline?: string | null;
  location?: string | null;
  summary?: string | null;
  years_experience?: number | null;
  skills?: unknown;
  soft_skills?: unknown;
  experiences?: unknown;
  educations?: unknown;
  languages?: unknown;
  certifications?: unknown;
  motivations?: unknown;
};

const TEXT_FIELDS = ["full_name", "headline", "email", "phone", "location", "summary"] as const;
const ARRAY_FIELDS = [
  "skills",
  "soft_skills",
  "experiences",
  "educations",
  "languages",
  "certifications",
  "links",
  "motivations",
] as const;

function keyOf(item: unknown): string {
  if (typeof item === "string") return item.toLowerCase().trim();
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    return String(o.name ?? o.title ?? o.degree ?? o.label ?? JSON.stringify(o))
      .toLowerCase()
      .trim();
  }
  return String(item);
}

function mergeArrays(current: unknown, incoming: unknown): unknown[] {
  const a = Array.isArray(current) ? current : [];
  const b = Array.isArray(incoming) ? incoming : [];
  const seen = new Map<string, unknown>();
  for (const item of [...a, ...b]) {
    const k = keyOf(item);
    if (!k || k === "undefined") continue;
    if (!seen.has(k)) seen.set(k, item);
  }
  return [...seen.values()];
}

/** Fusionne les données extraites par l'IA avec le profil existant sans perte d'information. */
export function mergeProfile(
  current: ProfileRow,
  extracted: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    const incoming = extracted[field];
    const existing = current[field];
    if (typeof incoming === "string" && incoming.trim().length > 0) {
      // Le résumé le plus riche gagne.
      if (field === "summary" && typeof existing === "string" && existing.length > incoming.length) {
        continue;
      }
      next[field] = incoming.trim();
    }
  }

  const years = Number(extracted.years_experience);
  if (Number.isFinite(years) && years > 0) {
    next.years_experience = Math.max(years, Number(current.years_experience ?? 0));
  }

  for (const field of ARRAY_FIELDS) {
    next[field] = mergeArrays(current[field], extracted[field]);
  }

  return next;
}

const COMPLETION_WEIGHTS: [string, number][] = [
  ["full_name", 8],
  ["headline", 8],
  ["email", 6],
  ["phone", 5],
  ["location", 8],
  ["summary", 15],
  ["skills", 18],
  ["experiences", 20],
  ["educations", 7],
  ["languages", 5],
];

export function computeCompletion(profile: Record<string, unknown>): number {
  let score = 0;
  for (const [field, weight] of COMPLETION_WEIGHTS) {
    const value = profile[field];
    if (Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim()) {
      score += weight;
    }
  }
  return Math.min(100, score);
}

/** Résumé compact du profil injecté dans les prompts IA. */
export function profileToPromptText(profile: ProfileRow): string {
  const skills = Array.isArray(profile.skills)
    ? profile.skills.map((s) => keyOf(s)).slice(0, 40).join(", ")
    : "";
  const experiences = Array.isArray(profile.experiences)
    ? profile.experiences
        .slice(0, 8)
        .map((e) => {
          const o = e as Record<string, unknown>;
          return `- ${o.title ?? ""} @ ${o.company ?? ""} (${o.start ?? ""} → ${o.end ?? ""}) : ${String(o.description ?? "").slice(0, 260)}`;
        })
        .join("\n")
    : "";
  const educations = Array.isArray(profile.educations)
    ? profile.educations.map((e) => keyOf(e)).slice(0, 6).join(" | ")
    : "";
  const languages = Array.isArray(profile.languages)
    ? profile.languages
        .map((l) => {
          const o = l as Record<string, unknown>;
          return typeof l === "string" ? l : `${o.name ?? ""} (${o.level ?? ""})`;
        })
        .join(", ")
    : "";

  return [
    `Nom : ${profile.full_name ?? "n/c"}`,
    `Titre : ${profile.headline ?? "n/c"}`,
    `Localisation : ${profile.location ?? "n/c"}`,
    `Années d'expérience : ${profile.years_experience ?? "n/c"}`,
    `Résumé : ${profile.summary ?? "n/c"}`,
    `Compétences : ${skills || "n/c"}`,
    `Soft skills : ${Array.isArray(profile.soft_skills) ? profile.soft_skills.join(", ") : ""}`,
    `Langues : ${languages || "n/c"}`,
    `Formations : ${educations || "n/c"}`,
    `Motivations : ${Array.isArray(profile.motivations) ? profile.motivations.join(" | ") : ""}`,
    `Expériences :\n${experiences || "n/c"}`,
  ].join("\n");
}

export function prefsToPromptText(prefs: Record<string, unknown> | null): string {
  if (!prefs) return "Aucune préférence renseignée.";
  const arr = (v: unknown) => (Array.isArray(v) ? v.join(", ") : "");
  return [
    `Poste recherché : ${prefs.target_role ?? "n/c"}`,
    `Mots-clés : ${arr(prefs.keywords)}`,
    `Localisations : ${arr(prefs.locations)}`,
    `Types de contrat : ${arr(prefs.contract_types)}`,
    `Télétravail : ${prefs.remote ?? "any"}`,
    `Séniorité visée : ${prefs.seniority ?? "n/c"}`,
    `Salaire minimum : ${prefs.min_salary ?? "n/c"}`,
    `À exclure : ${arr(prefs.exclusions)}`,
  ].join("\n");
}

export async function loadContext(supabase: SupabaseClient, userId: string) {
  const [profile, settings, prefs] = await Promise.all([
    supabase.from("nxj_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("nxj_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("nxj_preferences").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    profile: (profile.data ?? {}) as ProfileRow,
    settings: (settings.data ?? {}) as Record<string, unknown>,
    prefs: (prefs.data ?? null) as Record<string, unknown> | null,
  };
}
