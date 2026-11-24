import type { SupabaseClient } from "@supabase/supabase-js";
import { callAIJson } from "./ai.server";
import { firecrawlScrape, firecrawlSearch, humanDelay } from "./firecrawl.server";
import { loadContext, profileToPromptText } from "./profile.server";
import { COMPANY_SYSTEM, companyPrompt } from "./prompts.extra.server";

type CompanyReport = {
  company?: string;
  website?: string;
  location?: string;
  sector?: string;
  size?: string;
  founded?: string;
  overview?: string;
  activities?: string[];
  products?: string[];
  culture?: string[];
  news?: { title?: string; detail?: string; date?: string; url?: string }[];
  key_people?: { name?: string; role?: string }[];
  strengths?: string[];
  risks?: string[];
  interview_questions?: string[];
  questions_to_ask?: string[];
  talking_points?: string[];
};

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const num = (v: unknown, f: number) => (Number.isFinite(Number(v)) ? Number(v) : f);

/**
 * Recherche web complète sur une entreprise (Firecrawl) puis synthèse IA
 * orientée préparation d'entretien.
 */
export async function researchCompany(
  supabase: SupabaseClient,
  userId: string,
  input: { company: string; offerId?: string; context?: string },
) {
  const company = input.company.trim();
  if (!company) throw new Error("Nom d'entreprise manquant.");

  const { profile, settings } = await loadContext(supabase, userId);
  const apiKey = settings.firecrawl_api_key as string | undefined;
  if (!apiKey) throw new Error("Clé API Firecrawl manquante (onglet Paramètres).");
  const model = await (await import("@/lib/ai-models.server")).resolveAppAiModel(supabase, userId, "nexusjob");
  const region = "La Réunion";

  const scroll = {
    scrollDelayMs: num(settings.scroll_delay_ms, 2500),
    scrollJitterMs: num(settings.scroll_jitter_ms, 1200),
    scrollSteps: num(settings.scroll_steps, 3),
    waitForMs: num(settings.wait_for_ms, 2000),
    requestDelayMs: num(settings.request_delay_ms, 2000),
  };

  const queries = [
    `${company} entreprise ${region} présentation activité`,
    `${company} avis salariés culture recrutement`,
    `${company} actualité 2025 2026 développement`,
  ];

  const docs: string[] = [];
  const sources: { url: string; title: string }[] = [];

  for (const query of queries) {
    try {
      const results = await firecrawlSearch(apiKey, query, {
        limit: 4,
        country: (settings.country as string) ?? "FR",
        languages: ["fr"],
        scrape: true,
        onlyMainContent: true,
      });
      for (const r of results.slice(0, 4)) {
        if (sources.some((s) => s.url === r.url)) continue;
        sources.push({ url: r.url, title: r.title ?? r.url });
        let content = r.markdown ?? "";
        if (content.length < 600) {
          try {
            const doc = await firecrawlScrape(apiKey, r.url, {
              formats: ["markdown"],
              onlyMainContent: true,
              waitFor: scroll.waitForMs,
            });
            content = doc.markdown ?? content;
          } catch {
            /* page inaccessible : on garde ce qu'on a */
          }
        }
        docs.push(`### ${r.title ?? r.url}\nURL: ${r.url}\n${content.slice(0, 6000)}`);
      }
    } catch {
      /* une requête peut échouer sans bloquer la fiche */
    }
    await humanDelay(scroll);
  }

  if (!docs.length) throw new Error(`Aucune information web trouvée sur « ${company} ».`);

  const report = await callAIJson<CompanyReport>(model, [
    { role: "system", content: COMPANY_SYSTEM },
    {
      role: "user",
      content: companyPrompt(company, profileToPromptText(profile), docs.join("\n\n"), input.context ?? ""),
    },
  ]);

  const row = {
    user_id: userId,
    offer_id: input.offerId ?? null,
    company: report.company || company,
    website: report.website || null,
    location: report.location || null,
    sector: report.sector || null,
    size: report.size || null,
    founded: report.founded || null,
    overview: report.overview || null,
    activities: arr<string>(report.activities),
    products: arr<string>(report.products),
    culture: arr<string>(report.culture),
    news: arr(report.news),
    key_people: arr(report.key_people),
    strengths: arr<string>(report.strengths),
    risks: arr<string>(report.risks),
    interview_questions: arr<string>(report.interview_questions),
    questions_to_ask: arr<string>(report.questions_to_ask),
    talking_points: arr<string>(report.talking_points),
    sources,
    status: "done",
    raw_notes: null,
  };

  const { data, error } = await supabase
    .from("nxj_company_reports")
    .insert(row as never)
    .select()
    .single();
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  return data;
}
