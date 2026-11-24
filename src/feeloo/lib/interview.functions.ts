import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Generate (and persist) an AI interview kit for a job: questions per competency + scorecard grid. */
export const generateInterviewKitFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid(), refresh: z.boolean().default(false) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job } = await supabase.from("fl_jobs").select("*").eq("id", data.jobId).eq("user_id", userId).single();
    if (!job) throw new Error("Poste introuvable");
    const existing = job.interview_kit as any;
    if (!data.refresh && existing?.questions?.length) return existing;

    const { callAI, safeJson, getUserModel } = await import("@/feeloo/lib/hr-core.server");
    const model = await getUserModel(supabase, userId);
    const raw = await callAI(model, [
      { role: "system", content: "Tu es un expert en entretiens structurés. Construis un kit d'entretien pour le poste. JSON strict: {questions:[{competency, question, why, what_good_looks_like, follow_ups[], type}], scorecard_criteria:[{criterion, weight, description}], structure:[{stage, duration_min, goal}], red_flag_signals[], candidate_pitch}" },
      { role: "user", content: `POSTE: ${JSON.stringify({ title: job.title, seniority: job.seniority, description: job.description, required_skills: job.required_skills, nice_to_have: job.nice_to_have, requirements: job.requirements, responsibilities: job.responsibilities })}` },
    ], { json: true });
    const kit = safeJson<Record<string, any>>(raw, { questions: [], scorecard_criteria: [], structure: [] });
    await supabase.from("fl_jobs").update({ interview_kit: kit, updated_at: new Date().toISOString() })
      .eq("id", data.jobId).eq("user_id", userId);
    await supabase.from("fl_activity_log").insert({
      user_id: userId, kind: "interview_kit",
      message: `Kit d'entretien IA généré pour ${job.title}`,
      metadata: { job_id: data.jobId },
    });
    return kit;
  });

export const listScorecardsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    candidateId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("fl_interview_scorecards").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data.candidateId) q = q.eq("candidate_id", data.candidateId);
    if (data.jobId) q = q.eq("job_id", data.jobId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { scorecards: rows ?? [] };
  });

export const saveScorecardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    candidateId: z.string().uuid(),
    jobId: z.string().uuid().optional(),
    reviewerName: z.string().min(1).max(120).default("Moi"),
    stage: z.string().min(1).max(60).default("entretien"),
    criteria: z.array(z.object({ criterion: z.string(), rating: z.number().min(0).max(5), comment: z.string().optional() })).default([]),
    recommendation: z.enum(["strong_yes", "yes", "neutral", "no", "strong_no"]).default("neutral"),
    notes: z.string().max(4000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const overall = data.criteria.length
      ? Math.round((data.criteria.reduce((s, c) => s + c.rating, 0) / (data.criteria.length * 5)) * 100)
      : null;
    const row = {
      user_id: userId,
      candidate_id: data.candidateId,
      job_id: data.jobId ?? null,
      reviewer_name: data.reviewerName,
      stage: data.stage,
      criteria: data.criteria,
      overall_score: overall,
      recommendation: data.recommendation,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    };
    const res = data.id
      ? await supabase.from("fl_interview_scorecards").update(row).eq("id", data.id).eq("user_id", userId).select("*").single()
      : await supabase.from("fl_interview_scorecards").insert(row).select("*").single();
    if (res.error) throw res.error;
    await supabase.from("fl_activity_log").insert({
      user_id: userId, kind: "scorecard",
      message: `Scorecard ${data.stage} enregistrée (${overall ?? "?"}%)`,
      metadata: { candidate_id: data.candidateId, job_id: data.jobId ?? null },
    });
    return res.data;
  });

export const deleteScorecardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fl_interview_scorecards")
      .delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
