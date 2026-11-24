import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("fl_notifications").select("*")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(40);
    const rows = data ?? [];
    return { items: rows, unread: rows.filter((r: any) => !r.read_at).length };
  });

/** Recompute proactive alerts (high scores on priority jobs + duplicates). */
export const scanAlertsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { raiseHighScoreAlerts, detectDuplicates } = await import("@/feeloo/lib/alerts.server");
    const [alerts, dups] = await Promise.all([
      raiseHighScoreAlerts(supabase, userId),
      detectDuplicates(supabase, userId),
    ]);
    return { alerts, duplicates: dups };
  });

export const markNotificationsReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("fl_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    if (data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });
