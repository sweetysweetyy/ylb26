import { scanSheetForNewProspects, runAgentForNewProspects, pollAndRespondReplies, sendFollowupsDue } from "./pascal-engine.server";
import { withRetry } from "./retry.server";

async function logTick(userId: string | null, scope: string, status: string, duration_ms: number, result: unknown, error?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("psc_tick_logs").insert({ user_id: userId, scope, status, duration_ms, result: (result ?? {}) as never, error: error ?? null } as never);
}

function due(last: string | null | undefined, intervalMin: number): boolean {
  if (!last) return true;
  const elapsed = Date.now() - new Date(last).getTime();
  return elapsed >= intervalMin * 60 * 1000;
}

export async function runUserTick(userId: string, opts: { force?: boolean } = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let cfg = (await supabaseAdmin.from("psc_cron_config").select("*").eq("user_id", userId).maybeSingle()).data;
  if (!cfg) {
    cfg = (await supabaseAdmin.from("psc_cron_config").insert({ user_id: userId }).select().single()).data;
  }
  if (!cfg) { await logTick(userId, "user_tick", "skipped", 0, { reason: "no_config" }); return { skipped: true }; }
  const nowIso = new Date().toISOString();
  const result: Record<string, unknown> = { userId };
  const patch: Record<string, string> = {};
  const tickStart = Date.now();

  if (cfg.scan_enabled && (opts.force || due(cfg.last_scan_at, cfg.scan_interval_minutes))) {
    const t0 = Date.now();
    try {
      const { value: s } = await withRetry(() => scanSheetForNewProspects(userId), { label: "scan.sheet" });
      const { value: r } = await withRetry(() => runAgentForNewProspects(userId), { label: "scan.agent" });
      result.scan = { added: s.added, sent: r.sent };
      await logTick(userId, "scan", "success", Date.now() - t0, result.scan);
    } catch (e) {
      result.scan_error = String(e);
      await logTick(userId, "scan", "error", Date.now() - t0, {}, String(e));
    }
    patch.last_scan_at = nowIso;
  }
  if (cfg.replies_enabled && (opts.force || due(cfg.last_replies_at, cfg.replies_interval_minutes))) {
    const t0 = Date.now();
    try {
      const { value } = await withRetry(() => pollAndRespondReplies(userId), { label: "replies.poll" });
      result.replies = value;
      await logTick(userId, "replies", "success", Date.now() - t0, value);
    } catch (e) {
      result.replies_error = String(e);
      await logTick(userId, "replies", "error", Date.now() - t0, {}, String(e));
    }
    patch.last_replies_at = nowIso;
  }
  if (cfg.followups_enabled && (opts.force || due(cfg.last_followups_at, cfg.followups_interval_minutes))) {
    const t0 = Date.now();
    try {
      const { value } = await withRetry(() => sendFollowupsDue(userId), { label: "followups.send" });
      result.followups = value;
      await logTick(userId, "followups", "success", Date.now() - t0, value);
    } catch (e) {
      result.followups_error = String(e);
      await logTick(userId, "followups", "error", Date.now() - t0, {}, String(e));
    }
    patch.last_followups_at = nowIso;
  }
  if (Object.keys(patch).length) {
    await supabaseAdmin.from("psc_cron_config").update(patch as never).eq("user_id", userId);
    await logTick(userId, "user_tick", "success", Date.now() - tickStart, result);
  } else {
    await logTick(userId, "user_tick", "idle", Date.now() - tickStart, { reason: "no_task_due" });
  }
  return result as unknown as { userId: string };
}

export async function runGlobalTick() {
  const started = Date.now();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Tick tous les utilisateurs qui ont AU MOINS une automatisation activée
  // (avant on filtrait uniquement fully_autonomous=true, ce qui empêchait
  //  les utilisateurs "manuels par tâche" de recevoir le tick).
  const { data: users } = await supabaseAdmin
    .from("psc_cron_config")
    .select("user_id, fully_autonomous, scan_enabled, replies_enabled, followups_enabled");
  const eligible = (users ?? []).filter((u) => u.fully_autonomous || u.scan_enabled || u.replies_enabled || u.followups_enabled);
  const results: unknown[] = [];
  for (const u of eligible) {
    try { results.push(await runUserTick(u.user_id)); }
    catch (e) { results.push({ userId: u.user_id, error: String(e) }); }
  }
  await logTick(null, "global_tick", "success", Date.now() - started, { count: results.length });
  return { count: results.length };
}