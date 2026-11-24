import { pe } from "@/prospect/lib/db";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startProspectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => input)
  .handler(async ({ data, context }) => {
    const { startProspection } = await import("@/prospect/lib/engine.server");
    const result = await startProspection(context.userId, data.companyId);
    return { prospectionId: result.prospectionId, sent: result.sent, subject: result.draft.subject };
  });

export const sendDraftFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prospectionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const supabase = pe(context.supabase);
    const { data: prospection } = await supabase
      .from("pe_prospections")
      .select("company_id")
      .eq("id", data.prospectionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!prospection) throw new Error("Prospection introuvable.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await pe(supabaseAdmin)
      .from("pe_prospections")
      .update({ state: "READY", error: null })
      .eq("id", data.prospectionId);
    const { startProspection } = await import("@/prospect/lib/engine.server");
    const result = await startProspection(userId, prospection.company_id);
    return { sent: result.sent };
  });

export const tickProspectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prospectionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const supabase = pe(context.supabase);
    const { data: owned } = await supabase
      .from("pe_prospections")
      .select("id")
      .eq("id", data.prospectionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!owned) throw new Error("Prospection introuvable.");
    const { tickProspection } = await import("@/prospect/lib/engine.server");
    const result = await tickProspection(data.prospectionId);
    return result;
  });

export const setProspectionStateFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prospectionId: string; action: "pause" | "resume" | "stop" }) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const supabase = pe(context.supabase);
    const patch =
      data.action === "pause"
        ? { state: "PAUSED", next_check_at: null }
        : data.action === "stop"
          ? { state: "STOPPED", next_check_at: null, stop_reason: "Arrêt manuel de l'utilisateur" }
          : { state: "WAITING_REPLY", next_check_at: new Date().toISOString(), stop_reason: null, error: null };

    const { error } = await supabase
      .from("pe_prospections")
      .update(patch)
      .eq("id", data.prospectionId)
      .eq("user_id", userId);
    if (error) throw error;

    await supabase.from("pe_decisions").insert({
      user_id: userId,
      prospection_id: data.prospectionId,
      kind: `MANUAL_${data.action.toUpperCase()}`,
      rationale: "Action manuelle depuis le cockpit",
    });
    return { ok: true };
  });
