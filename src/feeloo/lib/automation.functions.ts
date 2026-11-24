import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getAutomationStateFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: settings }, { data: runs }, { data: google }, { data: skytabSheets }] = await Promise.all([
      supabase.from("fl_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("fl_cron_runs").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(30),
      supabase.from("google_connections").select("email:google_email, updated_at:created_at").eq("user_id", userId).maybeSingle(),
      (supabase as any).from("skytab_sheets").select("id, name, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
    ]);
    const [{ count: emails }, { count: rows }] = await Promise.all([
      supabase.from("fl_processed_emails").select("message_id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("fl_processed_sheet_rows").select("row_hash", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    return {
      settings: settings ?? null,
      runs: runs ?? [],
      google: google ?? null,
      skytabSheets: (skytabSheets ?? []) as { id: string; name: string; updated_at: string }[],
      memory: { emails: emails ?? 0, rows: rows ?? 0 },
    };
  });

export const saveAutomationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    gmail_cron_enabled: z.boolean().optional(),
    gmail_interval_minutes: z.number().int().min(1).max(1440).optional(),
    gmail_max_per_run: z.number().int().min(1).max(50).optional(),
    gmail_keywords: z.string().max(300).optional(),
    gmail_require_attachment: z.boolean().optional(),
    gmail_search_query: z.string().max(500).optional(),
    sheets_cron_enabled: z.boolean().optional(),
    sheets_interval_minutes: z.number().int().min(1).max(1440).optional(),
    sheets_max_per_run: z.number().int().min(1).max(50).optional(),
    sheets_spreadsheet_id: z.string().nullable().optional(),
    sheets_range: z.string().max(100).optional(),
    auto_sync: z.boolean().optional(),
    auto_match: z.boolean().optional(),
    email_provider: z.enum(["gmail", "sendy"]).optional(),
    spreadsheet_provider: z.enum(["google_sheets", "skytab"]).optional(),
    skytab_sheet_id: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("fl_settings")
      .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

export const runSyncNowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["gmail", "sheets"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: st } = await supabase.from("fl_settings").select("email_provider, spreadsheet_provider").eq("user_id", userId).maybeSingle();
    const internal = data.kind === "gmail" ? st?.email_provider === "sendy" : st?.spreadsheet_provider === "skytab";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let full: { refresh_token: string } | null = { refresh_token: "" };
    if (!internal) {
      const { data: conn } = await supabase.from("google_connections").select("user_id").eq("user_id", userId).maybeSingle();
      if (!conn) throw new Error("Compte Google non connecté.");
      full = (await supabaseAdmin.from("google_connections").select("refresh_token").eq("user_id", userId).maybeSingle()).data;
      if (!full?.refresh_token) throw new Error("Jeton Google introuvable, reconnecte ton compte.");
    }
    const { runGmailSync, runSheetsSync } = await import("@/feeloo/lib/sync-engine.server");
    const res: any = data.kind === "gmail"
      ? await runGmailSync(supabaseAdmin, userId, full.refresh_token, { trigger: "manuel", force: true })
      : await runSheetsSync(supabaseAdmin, userId, full.refresh_token, { trigger: "manuel", force: true });
    return JSON.parse(JSON.stringify(res ?? {})) as { found?: number; processed?: number; skipped?: number; skipped_reason?: string };
  });

export const clearSyncMemoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["gmail", "sheets"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.kind === "gmail") await supabaseAdmin.from("fl_processed_emails").delete().eq("user_id", userId);
    else await supabaseAdmin.from("fl_processed_sheet_rows").delete().eq("user_id", userId);
    return { ok: true };
  });
