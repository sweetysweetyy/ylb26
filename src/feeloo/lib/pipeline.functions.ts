import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const PIPELINE_STAGES = [
  { id: "sourced", label: "Sourcé" },
  { id: "contacted", label: "Contacté" },
  { id: "screening", label: "Préqualification" },
  { id: "interview", label: "Entretien" },
  { id: "client", label: "Présenté client" },
  { id: "offer", label: "Offre" },
  { id: "hired", label: "Recruté" },
  { id: "rejected", label: "Écarté" },
] as const;

const StageEnum = z.enum(["sourced", "contacted", "screening", "interview", "client", "offer", "hired", "rejected"]);

/** Board data for one job (or the global best-match board when jobId is omitted). */
export const getPipelineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: jobs } = await supabase.from("fl_jobs")
      .select("id, title, company, status, accepts_applications, priority")
      .eq("user_id", userId).order("priority", { ascending: false });

    const jobId = data.jobId ?? jobs?.[0]?.id ?? null;
    if (!jobId) return { jobs: jobs ?? [], jobId: null, cards: [] };

    let q = supabase.from("fl_candidate_job_matches")
      .select("id, candidate_id, job_id, score, stage, stage_notes, stage_updated_at, reasoning")
      .eq("user_id", userId).eq("job_id", jobId)
      .order("score", { ascending: false }).limit(200);
    const { data: rows, error } = await q;
    if (error) throw error;

    const ids = [...new Set((rows ?? []).map((r: any) => r.candidate_id))];
    let byId: Record<string, any> = {};
    if (ids.length) {
      const { data: cl } = await supabase.from("fl_candidates")
        .select("id, full_name, headline, seniority, email, status, available").in("id", ids);
      byId = Object.fromEntries((cl ?? []).map((c: any) => [c.id, c]));
    }
    return {
      jobs: jobs ?? [],
      jobId,
      cards: (rows ?? []).map((r: any) => ({ ...r, candidate: byId[r.candidate_id] ?? null })),
    };
  });

/** Drag & drop move: updates the stage, syncs candidate status and logs the move. */
export const moveStageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().uuid(), stage: StageEnum }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("fl_candidate_job_matches")
      .update({ stage: data.stage, stage_updated_at: new Date().toISOString() })
      .eq("id", data.matchId).eq("user_id", userId)
      .select("id, stage, candidate_id, job_id, score").single();
    if (error) throw error;

    // Business rule: advanced stages make the candidate unavailable for other jobs.
    const statusMap: Record<string, string | undefined> = {
      contacted: "screening", screening: "screening", interview: "in_progress",
      client: "in_progress", offer: "in_progress", hired: "hired", rejected: "rejected",
    };
    const nextStatus = statusMap[data.stage];
    if (nextStatus) {
      const patch: Record<string, unknown> = { status: nextStatus, updated_at: new Date().toISOString() };
      if (["interview", "client", "offer", "hired"].includes(data.stage)) patch.available = false;
      if (data.stage === "rejected") patch.available = true;
      await supabase.from("fl_candidates").update(patch as any).eq("id", row.candidate_id).eq("user_id", userId);
    }

    await supabase.from("fl_activity_log").insert({
      user_id: userId, kind: "pipeline_move",
      message: `Pipeline → ${data.stage}`,
      metadata: { match_id: row.id, candidate_id: row.candidate_id, job_id: row.job_id, stage: data.stage },
    });
    return row;
  });

export const setStageNotesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().uuid(), notes: z.string().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("fl_candidate_job_matches")
      .update({ stage_notes: data.notes }).eq("id", data.matchId).eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });
