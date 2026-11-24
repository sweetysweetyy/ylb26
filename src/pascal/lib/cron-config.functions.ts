import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CronSchema = z.object({
  scan_enabled: z.boolean(),
  scan_interval_minutes: z.number().int().min(1).max(1440),
  replies_enabled: z.boolean(),
  replies_interval_minutes: z.number().int().min(1).max(1440),
  followups_enabled: z.boolean(),
  followups_interval_minutes: z.number().int().min(5).max(1440),
  fully_autonomous: z.boolean(),
});

export const getCronConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const existing = await context.supabase.from("psc_cron_config").select("*").eq("user_id", context.userId).maybeSingle();
    if (existing.data) return existing.data;
    const ins = await context.supabase.from("psc_cron_config").insert({ user_id: context.userId }).select().single();
    return ins.data;
  });

export const updateCronConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CronSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("psc_cron_config").upsert({ user_id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runTickNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runUserTick } = await import("./cron-runner.server");
    await runUserTick(context.userId, { force: true });
    return { ok: true };
  });