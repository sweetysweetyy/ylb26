import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const saveSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      ai_model: z.string().optional(),
      gmail_search_query: z.string().optional(),
      sheets_spreadsheet_id: z.string().nullable().optional(),
      sheets_range: z.string().optional(),
      auto_sync: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("fl_settings")
      .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

export const getSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("fl_settings").select("*").eq("user_id", userId).maybeSingle();
    return data ?? { ai_model: "openai/gpt-5.5" };
  });

export const getIntegrationStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: gc } = await supabase.from("google_connections").select("email:google_email, scope, updated_at:created_at").eq("user_id", userId).maybeSingle();
    const { data: settings } = await supabase.from("fl_settings").select("sheets_spreadsheet_id, sheets_range, gmail_search_query").eq("user_id", userId).maybeSingle();
    return { google: gc ?? null, settings: settings ?? null };
  });

export const disconnectGoogleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("google_connections").delete().eq("user_id", userId);
    return { ok: true };
  });

/** Google is connected once in the Laboratory settings (shared connection). */
export const buildGoogleOAuthUrlFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ origin: z.string().url() }).parse(d))
  .handler(async ({ data }) => ({ url: `${data.origin}/settings?tab=google` }));
