import { aiJson } from "./ai.server";
import { crawlSite, multiSearch, webSearch, type WebResult } from "./web.server";

export type StructuredQuery = {
  query: string;
  company_type: string;
  sector: string;
  location: string;
  quantity: number;
  size: string | null;
  activity: string | null;
  criteria: Record<string, unknown>;
  exclusions: string[];
  commercial_intent: string | null;
  extra_info: string[];
  search_queries: string[];
};

export type Candidate = {
  name: string;
  website: string | null;
  city: string | null;
  reason: string | null;
  sources: string[];
};

export type EnrichedCompany = {
  name: string;
  legal_name: string | null;
  sector: string | null;
  subsector: string | null;
  description: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  socials: Record<string, string>;
  size: string | null;
  founded_year: string | null;
  legal_info: Record<string, unknown>;
  relevance_score: number;
  score_explanation: string | null;
  score_breakdown: Record<string, number>;
  ai_summary: string | null;
  prospect_understanding: Record<string, unknown>;
  signals: Array<{ type: string; description: string; source?: string; date?: string }>;
  why_contact: string | null;
  approach_angle: { angle: string; rationale: string; hooks: string[]; cta: string };
  decision_makers: Array<{ role: string; name?: string; note?: string }>;
  sources: Array<{ title: string; url: string }>;
  confidence: string;
};

const ANALYST_SYSTEM = `Tu es un analyste de prospection B2B senior. Tu structures des demandes en langage naturel
en critères de recherche exploitables par un moteur de recherche web. Tu es factuel et exhaustif.`;

export async function analyzeQuery(model: string, rawQuery: string, offer?: string | null) {
  const fallback: StructuredQuery = {
    query: rawQuery,
    company_type: rawQuery,
    sector: "",
    location: "",
    quantity: 10,
    size: null,
    activity: null,
    criteria: {},
    exclusions: [],
    commercial_intent: null,
    extra_info: [],
    search_queries: [rawQuery],
  };

  const structured = await aiJson<StructuredQuery>({
    model,
    system: ANALYST_SYSTEM,
    prompt: `Demande utilisateur: "${rawQuery}"
Offre de l'utilisateur: ${offer ?? "non précisée"}

Retourne un JSON avec exactement ces clés:
query, company_type, sector, location, quantity (nombre d'entreprises demandé, 10 par défaut),
size, activity, criteria (objet), exclusions (tableau), commercial_intent, extra_info (tableau),
search_queries (6 à 8 requêtes Google/annuaires très ciblées, en français, incluant annuaires,
LinkedIn, presse locale, pages officielles, pour trouver ces entreprises).`,
    fallback,
  });

  structured.quantity = Math.min(Math.max(Number(structured.quantity) || 10, 1), 30);
  if (!structured.search_queries?.length) structured.search_queries = [rawQuery];
  return structured;
}

export async function discoverCandidates(
  model: string,
  structured: StructuredQuery,
): Promise<{ candidates: Candidate[]; web: WebResult[] }> {
  const web = await multiSearch(structured.search_queries, 8);
  const digest = web
    .slice(0, 45)
    .map((item, index) => `[${index + 1}] ${item.title} — ${item.url}\n${item.snippet}`)
    .join("\n");

  const { candidates } = await aiJson<{ candidates: Candidate[] }>({
    model,
    system: `Tu identifies des entreprises réelles à partir de résultats de recherche web.
Tu n'inventes jamais une entreprise: chaque entreprise doit être appuyée par au moins un résultat.`,
    prompt: `Recherche demandée: ${JSON.stringify(structured)}

Résultats web collectés:
${digest || "(aucun résultat web, appuie-toi sur ta connaissance du terrain en restant prudent)"}

Sélectionne jusqu'à ${structured.quantity} entreprises distinctes correspondant réellement aux critères
(exclure annuaires, agrégateurs, plateformes génériques, franchises hors zone, doublons).
JSON: { "candidates": [{ "name", "website", "city", "reason", "sources": ["url"] }] }`,
    fallback: { candidates: [] },
  });

  const seen = new Set<string>();
  const unique = (candidates ?? []).filter((candidate) => {
    const key = (candidate.name ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { candidates: unique.slice(0, structured.quantity), web };
}

export async function enrichCandidate(
  model: string,
  structured: StructuredQuery,
  candidate: Candidate,
  offer?: string | null,
): Promise<EnrichedCompany> {
  const targeted = await webSearch(
    `"${candidate.name}" ${structured.location ?? ""} contact email actualité`,
    6,
  );
  const site = candidate.website ? await crawlSite(candidate.website) : null;

  const context = [
    `Nom: ${candidate.name}`,
    `Site: ${candidate.website ?? "inconnu"}`,
    `Ville supposée: ${candidate.city ?? "inconnue"}`,
    site
      ? `Contenu du site (${site.visited.join(", ")}):\n${site.text}\nEmails détectés: ${site.emails.join(", ")}\nTéléphones: ${site.phones.join(", ")}\nRéseaux: ${site.socials.join(", ")}`
      : "Site non accessible.",
    `Résultats web:\n${targeted.map((item) => `- ${item.title} (${item.url}): ${item.snippet}`).join("\n")}`,
  ].join("\n\n");

  const fallback: EnrichedCompany = {
    name: candidate.name,
    legal_name: null,
    sector: structured.sector || null,
    subsector: null,
    description: candidate.reason,
    website: candidate.website,
    address: null,
    city: candidate.city,
    region: structured.location || null,
    country: null,
    phone: site?.phones[0] ?? null,
    email: site?.emails[0] ?? null,
    linkedin: site?.socials.find((s) => s.includes("linkedin")) ?? null,
    socials: {},
    size: null,
    founded_year: null,
    legal_info: {},
    relevance_score: 55,
    score_explanation: "Informations partielles collectées.",
    score_breakdown: {},
    ai_summary: candidate.reason,
    prospect_understanding: {},
    signals: [],
    why_contact: null,
    approach_angle: { angle: "", rationale: "", hooks: [], cta: "" },
    decision_makers: [],
    sources: candidate.sources?.map((url) => ({ title: candidate.name, url })) ?? [],
    confidence: "faible",
  };

  const enriched = await aiJson<EnrichedCompany>({
    model,
    system: `Tu construis des fiches entreprises de prospection ultra pertinentes.
Règles: uniquement des informations appuyées par le contexte fourni; si une donnée est absente, mets null.
Tu produis aussi une analyse commerciale exploitable par un agent de vente.`,
    prompt: `Critères de recherche: ${JSON.stringify(structured)}
Offre de l'utilisateur: ${offer ?? "non précisée"}

CONTEXTE COLLECTÉ:
${context}

Produis un JSON avec ces clés exactes:
name, legal_name, sector, subsector, description, website, address, city, region, country, phone,
email (email professionnel public exploitable uniquement), linkedin, socials (objet), size, founded_year,
legal_info (objet: siren, siret, forme juridique si trouvés),
relevance_score (0-100), score_explanation (2 phrases expliquant le score),
score_breakdown (objet: correspondance, localisation, activite, taille, presence_web, signaux, coordonnees, fraicheur — chacun 0-100),
ai_summary (résumé intelligent 3-4 phrases),
prospect_understanding (objet: activite_principale, modele_economique, clientele, positionnement, proposition_valeur, decideurs, enjeux),
signals (tableau: {type, description, source, date}) — recrutement, expansion, nouveau service, actualité, partenariat...,
why_contact (pourquoi contacter cette entreprise, argumenté),
approach_angle (objet: angle, rationale, hooks (tableau de 3 accroches), cta),
decision_makers (tableau: {role, name, note}),
sources (tableau: {title, url}),
confidence ("élevée" | "moyenne" | "faible").`,
    fallback,
  });

  return {
    ...fallback,
    ...enriched,
    name: enriched.name || candidate.name,
    email: enriched.email ?? site?.emails[0] ?? null,
    phone: enriched.phone ?? site?.phones[0] ?? null,
    relevance_score: Math.min(Math.max(Number(enriched.relevance_score) || 0, 0), 100),
    sources:
      enriched.sources?.length
        ? enriched.sources
        : [...targeted.map((item) => ({ title: item.title, url: item.url }))].slice(0, 6),
  };
}
