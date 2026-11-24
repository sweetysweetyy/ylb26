import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function nextRunFrom(lastIso: string | null, intervalMin: number): string | null {
  if (!intervalMin) return null;
  const base = lastIso ? new Date(lastIso).getTime() : Date.now();
  return new Date(base + intervalMin * 60 * 1000).toISOString();
}

export const getCronHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const cfg = (await context.supabase.from("psc_cron_config").select("*").eq("user_id", context.userId).maybeSingle()).data;
    const { data: logs } = await context.supabase
      .from("psc_tick_logs")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(60);
    const errors = (logs ?? []).filter((l) => l.status === "error");
    const successes = (logs ?? []).filter((l) => l.status === "success");
    const lastRun = logs?.[0]?.created_at ?? null;
    const next = cfg
      ? {
          scan: cfg.scan_enabled ? nextRunFrom(cfg.last_scan_at, cfg.scan_interval_minutes) : null,
          replies: cfg.replies_enabled ? nextRunFrom(cfg.last_replies_at, cfg.replies_interval_minutes) : null,
          followups: cfg.followups_enabled ? nextRunFrom(cfg.last_followups_at, cfg.followups_interval_minutes) : null,
        }
      : null;
    return {
      cfg,
      logs: logs ?? [],
      stats: { total: (logs ?? []).length, errors: errors.length, successes: successes.length, lastRun },
      next,
    };
  });

export const clearTickLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("psc_tick_logs").delete().eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });