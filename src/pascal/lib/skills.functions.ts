import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SkillInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  category: z.enum(["objection", "opener", "closing", "nurturing", "psychology", "resource"]),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  priority: z.number().int().min(1).max(10),
  active: z.boolean(),
});

export const listSkills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("psc_agent_skills").select("*").eq("user_id", context.userId).order("priority", { ascending: false });
    return data ?? [];
  });

export const upsertSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SkillInput.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("psc_agent_skills").update(rest as never).eq("id", id).eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("psc_agent_skills").insert({ user_id: context.userId, ...rest } as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("psc_agent_skills").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const listAutoSkills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("psc_auto_skills").select("*").eq("user_id", context.userId).order("score", { ascending: false });
    return data ?? [];
  });

export const listAgentMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("psc_agent_memory").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const listKpiEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data } = await context.supabase.from("psc_kpi_events").select("*").eq("user_id", context.userId).gte("created_at", since).order("created_at", { ascending: false }).limit(500);
    return data ?? [];
  });