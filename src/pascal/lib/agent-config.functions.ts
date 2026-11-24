import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CfgSchema = z.object({
  agent_name: z.string().min(1),
  sender_name: z.string().min(1),
  sender_role: z.string().min(1),
  signature: z.string(),
  language: z.enum(["fr", "en"]),
  tone: z.string(),
  goals: z.string(),
  guardrails: z.string(),
  max_followups: z.number().int().min(0).max(10),
  followup_delay_hours: z.number().int().min(1).max(720),
  autonomous_replies: z.boolean(),
  paused: z.boolean(),
  system_prompt: z.string().optional().default(""),
  greeting: z.string().optional().default(""),
  mood_rules: z.string().optional().default(""),
  persistence_rules: z.string().optional().default(""),
});

export const getAgentConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const existing = await context.supabase.from("psc_agent_config").select("*").eq("user_id", context.userId).maybeSingle();
    if (existing.data) return existing.data;
    const ins = await context.supabase.from("psc_agent_config").insert({ user_id: context.userId }).select().single();
    return ins.data;
  });

export const updateAgentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CfgSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("psc_agent_config").upsert({ user_id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleAgentPause = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paused: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("psc_agent_config").update({ paused: data.paused }).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });