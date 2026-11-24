import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const setCandidateStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["new", "screening", "shortlisted", "in_progress", "completed", "hired", "rejected", "archived"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("fl_candidates")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", userId).select("id, full_name, status, available").single();
    if (error) throw error;
    if (row && !row.available) {
      await supabase.from("fl_candidate_job_matches").update({ status: "unavailable" })
        .eq("user_id", userId).eq("candidate_id", data.id).eq("status", "suggested");
    }
    await supabase.from("fl_activity_log").insert({
      user_id: userId, kind: "candidate_status",
      message: `Statut de ${row?.full_name} → ${data.status}`,
      metadata: { candidate_id: data.id, status: data.status, available: row?.available },
    });
    return row;
  });

export const setJobStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["open", "paused", "closed", "filled"]).optional(),
    accepts_applications: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: { updated_at: string; status?: string; accepts_applications?: boolean } = { updated_at: new Date().toISOString() };
    if (data.status) patch.status = data.status;
    if (typeof data.accepts_applications === "boolean") patch.accepts_applications = data.accepts_applications;
    const { data: row, error } = await supabase.from("fl_jobs")
      .update(patch).eq("id", data.id).eq("user_id", userId)
      .select("id, title, status, accepts_applications").single();
    if (error) throw error;
    await supabase.from("fl_activity_log").insert({
      user_id: userId, kind: "job_status",
      message: `Poste ${row?.title} → ${row?.status}${row?.accepts_applications ? "" : " (candidatures bloquées)"}`,
      metadata: { job_id: data.id },
    });
    return row;
  });
