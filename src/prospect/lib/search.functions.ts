import { pe } from "@/prospect/lib/db";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Full research pipeline: understand the request, search the web, build company files. */
export const runSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; quantity?: number }) => {
    if (!input?.query?.trim()) throw new Error("Décrivez votre recherche.");
    return { query: input.query.trim().slice(0, 2000), quantity: input.quantity };
  })
  .handler(async ({ data, context }) => {
    const { analyzeQuery, discoverCandidates, enrichCandidate } = await import("@/prospect/lib/research.server");
    const { userId } = context;
    const supabase = pe(context.supabase);

    const { data: settings } = await supabase
      .from("pe_settings")
      .select("model_analysis, model_research, offer_description")
      .eq("user_id", userId)
      .maybeSingle();

    const modelAnalysis = settings?.model_analysis ?? "openai/gpt-5.6-sol";
    const modelResearch = settings?.model_research ?? "openai/gpt-5.6-sol";
    const offer = settings?.offer_description ?? null;

    const { data: search, error: searchError } = await supabase
      .from("pe_searches")
      .insert({ user_id: userId, raw_query: data.query, status: "ANALYZING", progress: "Analyse de la demande" })
      .select("*")
      .single();
    if (searchError) throw searchError;

    try {
      const structured = await analyzeQuery(modelAnalysis, data.query, offer);
      if (data.quantity) structured.quantity = Math.min(Math.max(data.quantity, 1), 30);

      await supabase
        .from("pe_searches")
        .update({
          structured: structured as never,
          normalized_queries: structured.search_queries as never,
          quantity: structured.quantity,
          status: "SEARCHING",
          progress: "Recherche web approfondie",
        })
        .eq("id", search.id);

      const { candidates } = await discoverCandidates(modelResearch, structured);
      if (candidates.length === 0) {
        await supabase
          .from("pe_searches")
          .update({ status: "DONE", progress: "Aucune entreprise trouvée", error: "Aucun résultat pertinent" })
          .eq("id", search.id);
        return { searchId: search.id, companies: 0 };
      }

      await supabase
        .from("pe_searches")
        .update({ status: "ENRICHING", progress: `${candidates.length} entreprises identifiées, enrichissement en cours` })
        .eq("id", search.id);

      let inserted = 0;
      const batchSize = 3;
      for (let index = 0; index < candidates.length; index += batchSize) {
        const batch = candidates.slice(index, index + batchSize);
        const enriched = await Promise.all(
          batch.map(async (candidate) => {
            try {
              return await enrichCandidate(modelResearch, structured, candidate, offer);
            } catch (error) {
              console.error("enrich failed", candidate.name, error);
              return null;
            }
          }),
        );

        const rows = enriched
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .map((company) => ({
            user_id: userId,
            search_id: search.id,
            name: company.name,
            legal_name: company.legal_name,
            sector: company.sector,
            subsector: company.subsector,
            description: company.description,
            website: company.website,
            address: company.address,
            city: company.city,
            region: company.region,
            country: company.country,
            phone: company.phone,
            email: company.email,
            linkedin: company.linkedin,
            socials: (company.socials ?? {}) as never,
            size: company.size,
            founded_year: company.founded_year ? String(company.founded_year) : null,
            legal_info: (company.legal_info ?? {}) as never,
            relevance_score: company.relevance_score,
            score_explanation: company.score_explanation,
            score_breakdown: (company.score_breakdown ?? {}) as never,
            ai_summary: company.ai_summary,
            prospect_understanding: (company.prospect_understanding ?? {}) as never,
            signals: (company.signals ?? []) as never,
            why_contact: company.why_contact,
            approach_angle: (company.approach_angle ?? {}) as never,
            decision_makers: (company.decision_makers ?? []) as never,
            sources: (company.sources ?? []) as never,
            confidence: company.confidence,
            pipeline_status: "TO_PROSPECT",
          }));

        if (rows.length) {
          const { error } = await supabase.from("pe_companies").insert(rows);
          if (error) console.error("insert companies failed", error);
          else inserted += rows.length;
        }

        await supabase
          .from("pe_searches")
          .update({ progress: `${inserted}/${candidates.length} fiches construites` })
          .eq("id", search.id);
      }

      await supabase
        .from("pe_searches")
        .update({ status: "DONE", progress: `${inserted} fiches entreprises prêtes` })
        .eq("id", search.id);

      return { searchId: search.id, companies: inserted };
    } catch (error) {
      await supabase
        .from("pe_searches")
        .update({ status: "ERROR", error: (error as Error).message, progress: null })
        .eq("id", search.id);
      throw error;
    }
  });

/** Re-run the deep enrichment of a single company file. */
export const refreshCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => input)
  .handler(async ({ data, context }) => {
    const { enrichCandidate, analyzeQuery } = await import("@/prospect/lib/research.server");
    const { userId } = context;
    const supabase = pe(context.supabase);

    const { data: company } = await supabase
      .from("pe_companies")
      .select("*")
      .eq("id", data.companyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!company) throw new Error("Entreprise introuvable.");

    const { data: settings } = await supabase
      .from("pe_settings")
      .select("model_research, offer_description")
      .eq("user_id", userId)
      .maybeSingle();
    const model = settings?.model_research ?? "openai/gpt-5.6-sol";

    const structured = await analyzeQuery(
      model,
      `${company.name} ${company.sector ?? ""} ${company.city ?? ""}`,
      settings?.offer_description ?? null,
    );
    const enriched = await enrichCandidate(
      model,
      structured,
      {
        name: company.name,
        website: company.website,
        city: company.city,
        reason: company.description,
        sources: [],
      },
      settings?.offer_description ?? null,
    );

    const { error } = await supabase
      .from("pe_companies")
      .update({
        description: enriched.description ?? company.description,
        email: enriched.email ?? company.email,
        phone: enriched.phone ?? company.phone,
        address: enriched.address ?? company.address,
        relevance_score: enriched.relevance_score,
        score_explanation: enriched.score_explanation,
        score_breakdown: (enriched.score_breakdown ?? {}) as never,
        ai_summary: enriched.ai_summary,
        prospect_understanding: (enriched.prospect_understanding ?? {}) as never,
        signals: (enriched.signals ?? []) as never,
        why_contact: enriched.why_contact,
        approach_angle: (enriched.approach_angle ?? {}) as never,
        decision_makers: (enriched.decision_makers ?? []) as never,
        sources: (enriched.sources ?? []) as never,
        confidence: enriched.confidence,
      })
      .eq("id", company.id);
    if (error) throw error;
    return { ok: true };
  });
