import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Semantic search in the CV library: AI ranks the pool against a natural-language brief. */
export const semanticSearchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    query: z.string().min(3).max(600),
    limit: z.number().int().min(1).max(20).default(8),
    onlyAvailable: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { callAI, safeJson, getUserModel } = await import("@/feeloo/lib/hr-core.server");
    let q = supabase.from("fl_candidates")
      .select("id, full_name, headline, location, skills, soft_skills, languages, seniority, years_experience, summary, status, available")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(150);
    if (data.onlyAvailable) q = q.eq("available", true);
    const { data: pool } = await q;
    if (!pool?.length) return { results: [], interpretation: "Aucun candidat dans la CVthèque." };

    // Cheap lexical prefilter keeps the AI prompt focused on plausible profiles.
    const terms = data.query.toLowerCase().split(/[^a-zà-ú0-9+#.]+/).filter((t) => t.length > 2);
    const scored = pool.map((c: any) => {
      const hay = JSON.stringify(c).toLowerCase();
      return { c, hits: terms.filter((t) => hay.includes(t)).length };
    }).sort((a, b) => b.hits - a.hits);
    const shortlist = (scored.some((s) => s.hits > 0) ? scored.filter((s) => s.hits > 0) : scored).slice(0, 40).map((s) => s.c);

    const model = await getUserModel(supabase, userId);
    const raw = await callAI(model, [
      { role: "system", content: `Tu es un moteur de recherche sémantique RH. À partir d'un besoin exprimé en langage naturel, classe les candidats les plus pertinents (max ${data.limit}). Comprends les synonymes, les métiers proches et les niveaux. JSON strict: {interpretation, results:[{candidate_id, full_name, relevance(0-100), why, matched_signals[], caveats[]}]}` },
      { role: "user", content: `BESOIN: ${data.query}\n\nCANDIDATS:\n${JSON.stringify(shortlist)}` },
    ], { json: true });
    const out = safeJson<{ interpretation?: string; results?: any[] }>(raw, { results: [] });
    const byId = Object.fromEntries(shortlist.map((c: any) => [c.id, c]));
    return {
      interpretation: out.interpretation ?? "",
      results: (out.results ?? []).map((r: any) => ({ ...r, candidate: byId[r.candidate_id] ?? null })).filter((r: any) => r.candidate),
    };
  });

/** Detect + list candidate duplicates. */
export const scanDuplicatesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { detectDuplicates } = await import("@/feeloo/lib/alerts.server");
    await detectDuplicates(supabase, userId);
    return listDuplicates(supabase, userId);
  });

export const listDuplicatesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listDuplicates(context.supabase, context.userId));

async function listDuplicates(supabase: any, userId: string) {
  const { data } = await supabase.from("fl_candidate_duplicates").select("*")
    .eq("user_id", userId).eq("resolved", false).order("similarity", { ascending: false }).limit(50);
  const rows = data ?? [];
  const ids = [...new Set(rows.flatMap((r: any) => [r.candidate_id, r.duplicate_of]))];
  let byId: Record<string, any> = {};
  if (ids.length) {
    const { data: cl } = await supabase.from("fl_candidates")
      .select("id, full_name, email, phone, headline, created_at").in("id", ids);
    byId = Object.fromEntries((cl ?? []).map((c: any) => [c.id, c]));
  }
  return {
    pairs: rows.map((r: any) => ({ ...r, candidate: byId[r.candidate_id] ?? null, original: byId[r.duplicate_of] ?? null }))
      .filter((r: any) => r.candidate && r.original),
  };
}

export const resolveDuplicateFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(["ignore", "delete_duplicate"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pair } = await supabase.from("fl_candidate_duplicates").select("*")
      .eq("id", data.id).eq("user_id", userId).single();
    if (data.action === "delete_duplicate" && pair) {
      await supabase.from("fl_candidates").delete().eq("id", pair.candidate_id).eq("user_id", userId);
    }
    await supabase.from("fl_candidate_duplicates").update({ resolved: true }).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

/** Time-to-hire forecast: real historical stats + AI reading. */
export const forecastHiringFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { callAI, safeJson, getUserModel } = await import("@/feeloo/lib/hr-core.server");
    const [{ data: jobs }, { data: matches }, { data: cands }] = await Promise.all([
      supabase.from("fl_jobs").select("id, title, status, priority, created_at, accepts_applications").eq("user_id", userId).limit(80),
      supabase.from("fl_candidate_job_matches").select("job_id, score, stage, stage_updated_at, created_at").eq("user_id", userId).limit(1000),
      supabase.from("fl_candidates").select("id, status, created_at, available").eq("user_id", userId).limit(500),
    ]);
    const allJobs = jobs ?? [], allMatches = matches ?? [];
    const days = (a: string, b: string) => Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86400000);

    const hired = allMatches.filter((m: any) => m.stage === "hired");
    const avgHireDays = hired.length
      ? hired.reduce((s: number, m: any) => s + days(m.created_at, m.stage_updated_at), 0) / hired.length
      : null;

    const perJob = allJobs.filter((j: any) => j.status === "open").map((j: any) => {
      const ms = allMatches.filter((m: any) => m.job_id === j.id);
      const strong = ms.filter((m: any) => Number(m.score) >= 70).length;
      const advanced = ms.filter((m: any) => ["interview", "client", "offer"].includes(m.stage)).length;
      const ageDays = Math.round(days(j.created_at, new Date().toISOString()));
      const velocity = strong * 2 + advanced * 5;
      const eta = Math.max(5, Math.round((avgHireDays ?? 35) - velocity + ageDays * 0.1));
      return {
        job_id: j.id, title: j.title, priority: j.priority ?? 0, age_days: ageDays,
        candidates: ms.length, strong_candidates: strong, in_process: advanced,
        forecast_days: eta,
        probability: Math.min(95, 20 + strong * 8 + advanced * 12),
      };
    }).sort((a, b) => a.forecast_days - b.forecast_days);

    const stats = {
      open_jobs: allJobs.filter((j: any) => j.status === "open").length,
      pool: (cands ?? []).length,
      available: (cands ?? []).filter((c: any) => c.available !== false).length,
      hires: hired.length,
      avg_hire_days: avgHireDays ? Math.round(avgHireDays) : null,
    };

    let narrative: any = { headline: "", bottlenecks: [], recommendations: [] };
    if (perJob.length) {
      const model = await getUserModel(supabase, userId);
      const raw = await callAI(model, [
        { role: "system", content: "Tu es un analyste recrutement. Lis les prévisions chiffrées et produis un JSON strict: {headline, bottlenecks:[{job, issue, fix}], recommendations:[string], confidence(0-100)}" },
        { role: "user", content: `STATS: ${JSON.stringify(stats)}\n\nPRÉVISIONS PAR POSTE: ${JSON.stringify(perJob.slice(0, 15))}` },
      ], { json: true });
      narrative = safeJson(raw, narrative);
    }
    return { stats, forecasts: perJob, narrative };
  });
