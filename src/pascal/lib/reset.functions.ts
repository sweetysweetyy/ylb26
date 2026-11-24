import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ScopeSchema = z.object({
  wipeProspects: z.boolean(),
  wipeConversations: z.boolean(),
  wipeRuns: z.boolean(),
  wipeKpi: z.boolean(),
  wipeMemory: z.boolean(),
  wipeAutoSkills: z.boolean(),
  wipeSkills: z.boolean(),
  wipeActionPlans: z.boolean(),
  wipeSources: z.boolean(),
  fullReset: z.boolean().optional(),
});

export const cleanupData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScopeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const s = context.supabase;
    const stats: Record<string, number> = {};
    async function del(table: "psc_prospects" | "psc_conversations" | "psc_messages" | "psc_agent_runs" | "psc_kpi_events" | "psc_agent_memory" | "psc_auto_skills" | "psc_agent_skills" | "psc_action_plans" | "psc_sheet_sources" | "psc_prospect_state") {
      const r = await s.from(table).delete().eq("user_id", uid).select("id");
      stats[table] = r.data?.length ?? 0;
    }
    if (data.fullReset) {
      for (const t of ["psc_messages","psc_conversations","psc_prospect_state","psc_prospects","psc_agent_runs","psc_kpi_events","psc_agent_memory","psc_auto_skills","psc_agent_skills","psc_action_plans","psc_sheet_sources"] as const) await del(t);
    } else {
      if (data.wipeConversations) { await del("psc_messages"); await del("psc_conversations"); }
      if (data.wipeProspects) { await del("psc_messages"); await del("psc_conversations"); await del("psc_prospect_state"); await del("psc_prospects"); }
      if (data.wipeRuns) await del("psc_agent_runs");
      if (data.wipeKpi) await del("psc_kpi_events");
      if (data.wipeMemory) await del("psc_agent_memory");
      if (data.wipeAutoSkills) await del("psc_auto_skills");
      if (data.wipeSkills) await del("psc_agent_skills");
      if (data.wipeActionPlans) await del("psc_action_plans");
      if (data.wipeSources) await del("psc_sheet_sources");
    }
    return { ok: true, stats };
  });

export const generateDailyAutoSkillReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: events } = await supabaseAdmin.from("psc_kpi_events").select("*").eq("user_id", context.userId).gte("created_at", since);
    const wins = (events ?? []).filter((e) => e.event === "meeting_booked").length;
    const sent = (events ?? []).filter((e) => e.event === "first_email_sent" || e.event === "reply_sent").length;
    const summary = `Bilan 24h — ${sent} emails envoyés, ${wins} RDV décrochés.`;
    await supabaseAdmin.from("psc_agent_memory").insert({ user_id: context.userId, kind: "insight", technique: "daily_review", outcome: summary });
    return { summary, wins, sent };
  });