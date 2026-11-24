import type { SupabaseClient } from "@supabase/supabase-js";
import { callAIJson } from "./ai.server";
import {
  buildHumanActions,
  firecrawlScrape,
  firecrawlSearch,
  humanDelay,
  type FirecrawlAdvanced,
  type HumanScrollConfig,
} from "./firecrawl.server";
import { isReunion, mentionsRegion, normalize, regionQueryTerms } from "./geo";
import { loadContext, prefsToPromptText, profileToPromptText } from "./profile.server";
import { QUERY_SYSTEM, SCORING_SYSTEM, queryPrompt, scoringPrompt } from "./prompts.server";
import { PLAN_SYSTEM, planPrompt } from "./prompts.extra.server";
import { JOB_SOURCES } from "./sources";

type LogEntry = { at: string; level: "info" | "warn" | "error" | "success"; message: string };

type Decision = {
  url: string;
  title: string;
  source: string;
  round: number;
  decision: "kept" | "rejected";
  reason: string;
  score?: number;
};

type RawOffer = {
  url: string;
  source: string;
  title: string;
  description: string;
  content: string;
};

type ScoredOffer = {
  index: number;
  is_job_offer?: boolean;
  title?: string;
  company?: string;
  location?: string;
  region_match?: string;
  sector?: string;
  match_type?: string;
  salary?: string;
  contract_type?: string;
  remote?: string;
  seniority?: string;
  posted_at?: string;
  summary?: string;
  score?: number;
  score_breakdown?: Record<string, number>;
  matching_skills?: string[];
  missing_skills?: string[];
  keyword_matches?: string[];
  keyword_gaps?: string[];
  strengths?: string[];
  risks?: string[];
  interview_tips?: string[];
  cover_letter_hook?: string;
  reasoning?: string;
};

export type SearchPlan = {
  interpretation?: string;
  target_roles?: string[];
  sector?: string;
  must_have?: string[];
  nice_to_have?: string[];
  deal_breakers?: string[];
  locations?: string[];
  contract_types?: string[];
  remote?: string;
  keywords?: string[];
  negative_keywords?: string[];
  firecrawl?: Record<string, unknown>;
  queries?: { source: string; query: string; intent?: string }[];
  ranking_hints?: string[];
};

const num = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const str = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]).filter(Boolean) : []);

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Empreinte anti-doublon : même entreprise + même poste = même offre, quel que soit le site. */
function fingerprintOf(title: string, company: string, location: string) {
  const clean = (s: string) =>
    normalize(s)
      .replace(
        /\b(h f|f h|h f x|cdi|cdd|alternance|stage|interim|temps plein|temps partiel|urgent|offre|emploi|recrutement|poste)\b/g,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();
  const t = clean(title).split(" ").filter(Boolean).sort().join("-");
  const c = clean(company);
  const l = clean(location).split(" ")[0] ?? "";
  return `${c || "na"}::${t}::${c ? "" : l}`;
}

export async function runSearchPipeline(
  supabase: SupabaseClient,
  userId: string,
  input: { sources?: string[]; queryOverride?: string; limitPerSource?: number; brief?: string },
) {
  const logs: LogEntry[] = [];
  const decisions: Decision[] = [];
  const log = (level: LogEntry["level"], message: string) => {
    logs.push({ at: new Date().toISOString(), level, message });
  };

  const { profile, settings, prefs } = await loadContext(supabase, userId);
  const apiKey = settings.firecrawl_api_key as string | undefined;
  if (!apiKey) {
    throw new Error("Clé API Firecrawl manquante. Renseignez-la dans l'onglet Paramètres.");
  }
  if (!profile.full_name && !profile.summary && !Array.isArray(profile.skills)) {
    throw new Error("Complétez d'abord votre profil (importez votre CV).");
  }

  const model = await (await import("@/lib/ai-models.server")).resolveAppAiModel(supabase, userId, "nexusjob");
  const enabledIds =
    input.sources?.length
      ? input.sources
      : ((settings.sources as string[])?.length
          ? (settings.sources as string[])
          : JOB_SOURCES.filter((s) => s.defaultEnabled).map((s) => s.id));
  const sources = JOB_SOURCES.filter((s) => enabledIds.includes(s.id));
  if (!sources.length) throw new Error("Aucune source d'emploi sélectionnée.");

  const scrollConfig: HumanScrollConfig = {
    scrollDelayMs: num(settings.scroll_delay_ms, 2500),
    scrollJitterMs: num(settings.scroll_jitter_ms, 1200),
    scrollSteps: num(settings.scroll_steps, 4),
    waitForMs: num(settings.wait_for_ms, 2000),
    requestDelayMs: num(settings.request_delay_ms, 3000),
  };

  const advanced: FirecrawlAdvanced = {
    timeout: num(settings.firecrawl_timeout_ms, 45000),
    maxAge: num(settings.firecrawl_max_age_ms, 0),
    mobile: Boolean(settings.firecrawl_mobile),
    blockAds: (settings.firecrawl_block_ads as boolean) !== false,
    skipTlsVerification: Boolean(settings.firecrawl_skip_tls),
    removeBase64Images: (settings.firecrawl_remove_base64 as boolean) !== false,
    includeTags: arr(settings.firecrawl_include_tags),
    excludeTags: arr(settings.firecrawl_exclude_tags),
  };

  const region = str(prefs?.region, "La Réunion");
  const regionTerms = regionQueryTerms(region);
  const enforceRegion =
    (settings.enforce_region as boolean) !== false && (prefs?.region_strict as boolean) !== false;
  const sectorList = arr(prefs?.sectors);
  const sector = str(prefs?.sector, sectorList[0] ?? "");
  const flexibility = str(prefs?.flexibility, "balanced");
  const includeSimilar = (prefs?.include_similar as boolean) !== false;
  const minResults = Math.min(Math.max(num(prefs?.min_results, 10), 1), 60);
  const maxRounds = Math.min(Math.max(num(settings.max_rounds, 3), 1), 5);
  const batchSize = Math.min(Math.max(num(settings.scoring_batch_size, 4), 1), 8);
  const dedupeByTitle = (settings.dedupe_by_title as boolean) !== false;
  const minScore = Math.min(num(settings.min_score, 50), 100);
  const fallbackMinScore = Math.min(num(settings.fallback_min_score, 25), minScore);
  const autotune = (settings.ai_autotune as boolean) !== false;
  const brief = str(input.brief, str(prefs?.brief));

  const profileText = profileToPromptText(profile);
  const prefsText = [
    prefsToPromptText(prefs),
    `Secteur(s) d'activité : ${[sector, ...sectorList].filter(Boolean).join(", ") || "n/c"}`,
    `Région imposée : ${region}`,
    `Souplesse : ${flexibility}`,
    `Offres similaires acceptées : ${includeSimilar ? "oui" : "non"}`,
    `Nombre minimum d'offres souhaité : ${minResults}`,
    prefs?.notes ? `Consignes libres : ${prefs.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const targetRole =
    str(prefs?.target_role) || sector || str(profile.headline as string) || "emploi";

  const searchRecord = await supabase
    .from("nxj_searches")
    .insert({
      user_id: userId,
      query: input.queryOverride ?? brief.slice(0, 200) ?? targetRole,
      brief: brief || null,
      target_role: targetRole,
      sources: enabledIds,
      locations: [region, ...arr(prefs?.locations)],
      status: "running",
      stage: "Initialisation",
      progress: 3,
      logs: logs as never,
    } as never)
    .select()
    .single();

  const searchId = (searchRecord.data as { id: string } | null)?.id;

  /** Pousse l'état en base : l'interface l'affiche en temps réel via Realtime. */
  const flush = async (stage: string, progress: number, extra: Record<string, unknown> = {}) => {
    if (!searchId) return;
    await supabase
      .from("nxj_searches")
      .update({
        stage,
        progress: Math.max(0, Math.min(99, Math.round(progress))),
        logs: logs as never,
        decisions: decisions as never,
        ...extra,
      } as never)
      .eq("id", searchId);
  };

  const perSource = Math.min(
    Math.max(num(input.limitPerSource ?? settings.firecrawl_search_limit, 8), 1),
    20,
  );

  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const seenFingerprints = new Set<string>();
  const usedQueries = new Set<string>();
  const kept: (ScoredOffer & { raw: RawOffer })[] = [];
  let plan: SearchPlan = {};

  const buildScopedQuery = (sourceDomain: string, query: string) => {
    let q = query;
    if (!regionTerms.some((t) => normalize(q).includes(normalize(t)))) {
      q = `${q} ${regionTerms[0]}`;
    }
    return sourceDomain ? `site:${sourceDomain} ${q}` : q;
  };

  try {
    // ── ÉTAPE 1 : l'IA comprend la demande et configure Firecrawl ─────────────
    log("info", `Compréhension de votre demande par l'IA (${model})…`);
    await flush("Analyse de votre demande par l'IA", 8);
    if (autotune) {
      try {
        plan = await callAIJson<SearchPlan>(model, [
          { role: "system", content: PLAN_SYSTEM },
          {
            role: "user",
            content: planPrompt(
              profileText,
              input.queryOverride ? `${prefsText}\nConsigne prioritaire : ${input.queryOverride}` : prefsText,
              brief,
              sources.map((s) => `${s.id} → ${s.domain || "sites carrière"}`).join("\n"),
              { region, regionTerms, minResults },
            ),
          },
        ]);
        log("success", `Plan de recherche établi : ${str(plan.interpretation, "intention comprise")}`);
        if (plan.firecrawl?.reasoning) {
          log("info", `Réglages Firecrawl choisis par l'IA : ${String(plan.firecrawl.reasoning)}`);
        }
      } catch (error) {
        log("warn", `Planification IA indisponible, réglages manuels conservés. (${String(error).slice(0, 120)})`);
      }
    }

    const fc = (plan.firecrawl ?? {}) as Record<string, unknown>;
    const searchLimit = Math.min(Math.max(num(fc.limit, perSource), 1), 20);
    const tbs = str(fc.tbs, freshnessToTbs(str(prefs?.freshness, "any")));
    const country = str(fc.country, str(settings.country, "FR"));
    const languages = arr(fc.languages).length ? arr(fc.languages) : (arr(settings.languages).length ? arr(settings.languages) : ["fr"]);
    const onlyMain = fc.onlyMainContent !== undefined ? Boolean(fc.onlyMainContent) : (settings.only_main_content as boolean) !== false;
    const proxy = str(fc.proxy, str(settings.proxy_mode, "auto"));
    const formats = arr(fc.formats).length ? arr(fc.formats) : arr(settings.scrape_formats).length ? arr(settings.scrape_formats) : ["markdown"];
    const deepScrape = fc.deepScrape !== undefined ? Boolean(fc.deepScrape) : true;
    const deepScrapeLimit = deepScrape ? Math.min(Math.max(num(settings.deep_scrape_limit, 8), 0), 20) : 0;
    const runScroll: HumanScrollConfig = {
      ...scrollConfig,
      scrollSteps: num(fc.scrollSteps, scrollConfig.scrollSteps),
      waitForMs: num(fc.waitFor, scrollConfig.waitForMs),
    };

    const effectivePlan = {
      ...plan,
      firecrawl: {
        ...fc,
        limit: searchLimit,
        tbs,
        country,
        languages,
        onlyMainContent: onlyMain,
        proxy,
        formats,
        deepScrape,
        waitFor: runScroll.waitForMs,
        scrollSteps: runScroll.scrollSteps,
        timeout: advanced.timeout,
        blockAds: advanced.blockAds,
        mobile: advanced.mobile,
        maxAge: advanced.maxAge,
      },
    };
    await flush("Plan de recherche prêt", 14, { plan: effectivePlan as never });

    const negatives = arr(plan.negative_keywords).map((k) => normalize(k)).filter(Boolean);

    for (let round = 1; round <= maxRounds && kept.length < minResults; round++) {
      const roundBase = 15 + (round - 1) * (80 / maxRounds);
      log("info", `Tour ${round}/${maxRounds} — exploration de ${sources.length} source(s) sur ${region}…`);
      await flush(`Tour ${round} — préparation des requêtes`, roundBase);

      let queries: { source: string; query: string }[] =
        round === 1
          ? (plan.queries ?? []).map((q) => ({ source: q.source, query: q.query }))
          : [];

      if (!queries.length) {
        try {
          const generated = await callAIJson<{ queries?: { source: string; query: string }[] }>(model, [
            { role: "system", content: QUERY_SYSTEM },
            {
              role: "user",
              content: queryPrompt(
                profileText,
                [prefsText, brief ? `Demande libre du candidat : ${brief}` : ""].filter(Boolean).join("\n"),
                sources.map((s) => `${s.id} → ${s.domain || "sites carrière"}`).join("\n"),
                {
                  region,
                  regionTerms,
                  sector: str(plan.sector, sector),
                  flexibility: round === 1 ? flexibility : "large",
                  round,
                  alreadyFound: kept.length,
                  minResults,
                },
              ),
            },
          ]);
          queries = generated.queries ?? [];
        } catch (error) {
          log("warn", `Génération IA indisponible, requêtes de repli. (${String(error).slice(0, 120)})`);
        }
      }

      const roles = arr(plan.target_roles);
      const base = input.queryOverride || roles[0] || targetRole;
      const fallbacks = [
        `${base} ${regionTerms[0]} offre emploi`,
        `${roles[1] || sector || base} recrutement ${regionTerms[1] ?? regionTerms[0]}`,
      ];

      const rawOffers: RawOffer[] = [];

      for (const source of sources) {
        const sourceQueries = queries.filter((q) => q.source === source.id).map((q) => q.query);
        const list = (sourceQueries.length ? sourceQueries : fallbacks).slice(0, round === 1 ? 3 : 3);

        for (const q of list) {
          const scoped = buildScopedQuery(source.domain, q);
          if (usedQueries.has(scoped)) continue;
          usedQueries.add(scoped);
          log("info", `${source.label} — « ${scoped} »`);
          await flush(`Firecrawl explore ${source.label}`, roundBase + 5);
          try {
            const results = await firecrawlSearch(apiKey, scoped, {
              limit: searchLimit,
              country,
              languages,
              tbs: tbs || undefined,
              scrape: true,
              onlyMainContent: onlyMain,
              formats,
              advanced,
            });
            let added = 0;
            for (const result of results) {
              const url = result.url.split("#")[0];
              if (seenUrls.has(url)) continue;
              seenUrls.add(url);
              const haystack = normalize(`${result.title ?? ""} ${result.description ?? ""}`);
              const blocked = negatives.find((n) => n && haystack.includes(n));
              if (blocked) {
                decisions.push({
                  url,
                  title: result.title ?? url,
                  source: source.label,
                  round,
                  decision: "rejected",
                  reason: `Contient un mot-clé exclu : « ${blocked} »`,
                });
                continue;
              }
              const titleKey = normalize(`${result.title ?? ""}`).slice(0, 80);
              if (dedupeByTitle && titleKey && seenTitles.has(titleKey)) {
                decisions.push({
                  url,
                  title: result.title ?? url,
                  source: source.label,
                  round,
                  decision: "rejected",
                  reason: "Doublon d'intitulé déjà collecté",
                });
                continue;
              }
              if (titleKey) seenTitles.add(titleKey);
              rawOffers.push({
                url,
                source: source.label,
                title: result.title ?? "",
                description: result.description ?? "",
                content: (result.markdown ?? "").slice(0, 6000),
              });
              added++;
            }
            log("success", `${added} page(s) retenue(s) sur ${source.label}.`);
          } catch (error) {
            log("warn", `${source.label} : ${error instanceof Error ? error.message : "échec"}`);
          }
          await humanDelay(runScroll);
        }
      }

      // Lecture approfondie (scroll humanisé) des pages trop pauvres
      const needsScrape = rawOffers.filter((o) => o.content.length < 800).slice(0, deepScrapeLimit);
      for (const offer of needsScrape) {
        try {
          log("info", `Lecture approfondie : ${offer.url}`);
          await flush("Lecture approfondie des annonces", roundBase + 12);
          const doc = await firecrawlScrape(apiKey, offer.url, {
            formats,
            onlyMainContent: onlyMain,
            waitFor: runScroll.waitForMs,
            actions: buildHumanActions(runScroll),
            country,
            languages,
            proxy,
            advanced,
          });
          if (doc.markdown) offer.content = doc.markdown.slice(0, 6000);
        } catch (error) {
          log("warn", `Lecture impossible (${offer.url}) : ${String(error).slice(0, 120)}`);
        }
        await humanDelay(runScroll);
      }

      // Pré-filtre géographique local (avant l'IA) pour économiser des appels
      const geoFiltered = enforceRegion
        ? rawOffers.filter((o) => {
            const ok = mentionsRegion(`${o.title} ${o.description} ${o.content} ${o.url}`, region);
            if (!ok) {
              decisions.push({
                url: o.url,
                title: o.title || o.url,
                source: o.source,
                round,
                decision: "rejected",
                reason: `Aucune mention de ${region} dans la page`,
              });
            }
            return ok;
          })
        : rawOffers;
      if (enforceRegion && geoFiltered.length !== rawOffers.length) {
        log("info", `${rawOffers.length - geoFiltered.length} page(s) hors ${region} écartée(s) avant analyse.`);
      }
      const toAnalyze = geoFiltered.length ? geoFiltered : rawOffers;
      if (!toAnalyze.length) {
        log("warn", `Tour ${round} : aucune page exploitable.`);
        continue;
      }

      log("info", `Analyse IA de ${toAnalyze.length} page(s) avec ${model}…`);
      for (let i = 0; i < toAnalyze.length; i += batchSize) {
        const batch = toAnalyze.slice(i, i + batchSize);
        await flush(
          `Analyse IA des offres (${Math.min(i + batch.length, toAnalyze.length)}/${toAnalyze.length})`,
          roundBase + 18 + (i / Math.max(toAnalyze.length, 1)) * 20,
        );
        const block = batch
          .map(
            (o, idx) =>
              `### OFFRE ${idx}\nURL: ${o.url}\nSOURCE: ${o.source}\nTITRE: ${o.title}\nRESUME: ${o.description}\nCONTENU:\n${o.content.slice(0, 4500)}`,
          )
          .join("\n\n");
        try {
          const analysis = await callAIJson<{ offers?: ScoredOffer[] }>(model, [
            { role: "system", content: SCORING_SYSTEM },
            {
              role: "user",
              content: [
                scoringPrompt(profileText, prefsText, block, {
                  region,
                  sector: str(plan.sector, sector),
                  flexibility: round === 1 ? flexibility : "large",
                }),
                brief ? `\nDEMANDE LIBRE DU CANDIDAT (prioritaire) :\n${brief}` : "",
                arr(plan.must_have).length ? `\nCRITÈRES NON NÉGOCIABLES : ${arr(plan.must_have).join(", ")}` : "",
                arr(plan.deal_breakers).length ? `\nÀ REFUSER : ${arr(plan.deal_breakers).join(", ")}` : "",
                arr(plan.ranking_hints).length ? `\nCE QUI DOIT FAIRE MONTER LE SCORE : ${arr(plan.ranking_hints).join(", ")}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ]);
          for (const item of analysis.offers ?? []) {
            const raw = batch[item.index ?? 0];
            if (!raw) continue;
            const label = item.title || raw.title || raw.url;
            const push = (decision: Decision["decision"], reason: string) =>
              decisions.push({
                url: raw.url,
                title: label,
                source: raw.source,
                round,
                decision,
                reason,
                score: num(item.score, 0),
              });

            if (item.is_job_offer === false) {
              push("rejected", "Page identifiée comme liste/catégorie, pas une offre unique");
              continue;
            }
            const inRegion =
              item.region_match === "in_region" ||
              mentionsRegion(`${item.location ?? ""} ${raw.content.slice(0, 2500)}`, region);
            if (enforceRegion && item.region_match === "out_of_region" && !inRegion) {
              push("rejected", `Offre localisée hors ${region} (${item.location ?? "lieu inconnu"})`);
              continue;
            }
            if (!includeSimilar && item.match_type && item.match_type !== "exact") {
              push("rejected", "Recherche stricte : correspondance non exacte");
              continue;
            }
            const fp = fingerprintOf(item.title ?? raw.title, item.company ?? "", item.location ?? "");
            if (seenFingerprints.has(fp)) {
              push("rejected", "Doublon : même poste et même entreprise déjà retenus sur une autre source");
              continue;
            }
            seenFingerprints.add(fp);
            push("kept", str(item.reasoning, "Offre pertinente retenue par l'analyse IA"));
            kept.push({ ...item, raw });
          }
        } catch (error) {
          log("warn", `Lot non analysé : ${String(error).slice(0, 140)}`);
        }
      }

      log("success", `Tour ${round} : ${kept.length}/${minResults} offre(s) pertinente(s).`);
      await flush(`Tour ${round} terminé — ${kept.length}/${minResults} offres`, roundBase + 45);
    }

    if (!kept.length) {
      throw new Error(
        `Aucune offre trouvée pour ${region}. Élargissez le secteur, la souplesse ou vérifiez votre clé Firecrawl.`,
      );
    }

    await flush("Sélection finale et déduplication", 92);

    const sorted = [...kept].sort((a, b) => num(b.score, 0) - num(a.score, 0));
    let selection = sorted.filter((o) => num(o.score, 0) >= minScore);
    if (selection.length < minResults) {
      const extra = sorted
        .filter((o) => !selection.includes(o) && num(o.score, 0) >= fallbackMinScore)
        .slice(0, minResults - selection.length);
      if (extra.length) {
        log(
          "info",
          `${extra.length} offre(s) proche(s) ajoutée(s) (score ≥ ${fallbackMinScore}%) pour atteindre le volume demandé.`,
        );
      }
      selection = [...selection, ...extra];
    }
    if (!selection.length) selection = sorted.slice(0, minResults);

    // Déduplication finale avec l'historique de l'utilisateur (même poste/entreprise déjà en base)
    const fps = selection.map((o) => fingerprintOf(o.title ?? o.raw.title, o.company ?? "", o.location ?? ""));
    const { data: existing } = await supabase
      .from("nxj_offers")
      .select("fingerprint,url")
      .eq("user_id", userId)
      .limit(1000);
    const known = new Set(
      ((existing ?? []) as { fingerprint: string | null; url: string }[]).flatMap((r) =>
        [r.fingerprint, r.url].filter(Boolean) as string[],
      ),
    );

    const rows = selection
      .map((o, i) => ({ o, fp: fps[i] }))
      .filter(({ o, fp }) => {
        if (known.has(fp) || known.has(o.raw.url)) {
          decisions.push({
            url: o.raw.url,
            title: o.title ?? o.raw.title,
            source: o.raw.source,
            round: 0,
            decision: "rejected",
            reason: "Déjà présente dans vos offres (doublon historique)",
            score: num(o.score, 0),
          });
          return false;
        }
        known.add(fp);
        return true;
      })
      .map(({ o, fp }) => ({
        user_id: userId,
        search_id: searchId,
        title: o.title || o.raw.title || "Offre sans titre",
        company: o.company ?? null,
        location: o.location ?? null,
        salary: o.salary || null,
        contract_type: o.contract_type ?? null,
        remote: o.remote ?? null,
        seniority: o.seniority ?? null,
        sector: o.sector ?? sector ?? null,
        match_type: o.match_type ?? null,
        region_match: o.region_match ?? (isReunion(region) ? "unknown" : null),
        summary: o.summary ?? null,
        description: o.raw.content.slice(0, 8000),
        url: o.raw.url,
        source: o.raw.source,
        source_domain: domainOf(o.raw.url),
        fingerprint: fp,
        fetched_at: new Date().toISOString(),
        posted_at: o.posted_at ?? null,
        score: Math.max(0, Math.min(100, Math.round(num(o.score, 0)))),
        score_breakdown: o.score_breakdown ?? {},
        matching_skills: arr(o.matching_skills),
        missing_skills: arr(o.missing_skills),
        keyword_matches: arr(o.keyword_matches),
        keyword_gaps: arr(o.keyword_gaps),
        strengths: arr(o.strengths),
        risks: arr(o.risks),
        interview_tips: arr(o.interview_tips),
        cover_letter_hook: o.cover_letter_hook ?? null,
        reasoning: o.reasoning ?? null,
      }));

    if (rows.length) {
      const { error } = await supabase.from("nxj_offers").insert(rows as never);
      if (error) log("warn", `Enregistrement partiel : ${error.message}`);
    }

    const avg = rows.length ? rows.reduce((a, r) => a + r.score, 0) / rows.length : null;
    log("success", `${rows.length} offre(s) enregistrée(s) pour ${region}.`);

    if (searchId) {
      await supabase
        .from("nxj_searches")
        .update({
          status: "done",
          stage: "Terminé",
          progress: 100,
          results_count: rows.length,
          avg_score: avg,
          logs: logs as never,
          decisions: decisions as never,
          plan: effectivePlan as never,
          finished_at: new Date().toISOString(),
        } as never)
        .eq("id", searchId);
    }

    return { searchId, count: rows.length, avgScore: avg, logs, plan: effectivePlan, decisions };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    log("error", message);
    if (searchId) {
      await supabase
        .from("nxj_searches")
        .update({
          status: "error",
          stage: "Erreur",
          progress: 100,
          error: message,
          logs: logs as never,
          decisions: decisions as never,
          finished_at: new Date().toISOString(),
        } as never)
        .eq("id", searchId);
    }
    throw error;
  }
}

function freshnessToTbs(freshness: string) {
  if (freshness === "week") return "qdr:w";
  if (freshness === "month") return "qdr:m";
  return "";
}
