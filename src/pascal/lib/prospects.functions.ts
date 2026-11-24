import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listProspects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("psc_prospects")
      .select("*, conversations:psc_conversations(id, last_message_at)")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    return data ?? [];
  });

export const listConversationsWithProspect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("psc_conversations")
      .select("*, prospects:psc_prospects(*)")
      .eq("user_id", context.userId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    return data ?? [];
  });

export const listMessagesInConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: msgs } = await context.supabase
      .from("psc_messages")
      .select("*")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", context.userId)
      .order("sent_at", { ascending: true });
    return msgs ?? [];
  });

export const triggerAgentForProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ prospectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { sendFirstOutreach } = await import("./pascal-engine.server");
    await sendFirstOutreach(context.userId, data.prospectId);
    return { ok: true };
  });

export const pollRepliesNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { pollAndRespondReplies } = await import("./pascal-engine.server");
    return await pollAndRespondReplies(context.userId);
  });

export const updateProspectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["new","contacted","replied","meeting_booked","lost","paused"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("psc_prospects").update({ status: data.status }).eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const dashboardKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: all } = await context.supabase.from("psc_prospects").select("status").eq("user_id", context.userId);
    const rows = all ?? [];
    const total = rows.length;
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
    const contacted = (counts.contacted ?? 0) + (counts.replied ?? 0) + (counts.meeting_booked ?? 0) + (counts.lost ?? 0);
    const replied = (counts.replied ?? 0) + (counts.meeting_booked ?? 0);
    const responseRate = contacted ? Math.round((replied / contacted) * 100) : 0;
    const conversionRate = contacted ? Math.round(((counts.meeting_booked ?? 0) / contacted) * 100) : 0;
    const { data: runs } = await context.supabase.from("psc_agent_runs").select("kind, status, detail, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(15);
    return { total, counts, responseRate, conversionRate, runs: runs ?? [] };
  });