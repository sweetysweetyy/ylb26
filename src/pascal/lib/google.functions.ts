import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const startGoogleOauth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data }) => ({ url: `${data.origin}/settings?tab=google` }));

export const getGoogleConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("google_connections")
      .select("google_email, scopes:scope, connected_at:created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data;
  });

export const disconnectGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("google_connections").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const listSpreadsheetTabs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ spreadsheetId: z.string().min(10) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getSpreadsheetMeta } = await import("./google-api.server");
    const meta = await getSpreadsheetMeta(context.userId, data.spreadsheetId);
    return { title: meta.properties.title, tabs: meta.sheets.map((s) => s.properties.title) };
  });

export const previewSheetHeaders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ spreadsheetId: z.string(), sheetName: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getSheetValues } = await import("./google-api.server");
    const r = await getSheetValues(context.userId, data.spreadsheetId, `${data.sheetName}!A1:Z1`);
    return { headers: r.values?.[0] ?? [] };
  });

export const completeGoogleOauth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().min(1), state: z.string().min(1), origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { exchangeCode, fetchGoogleUserInfo, encryptToken } = await import("./google-oauth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const expectedState = userResp.user?.user_metadata?.google_oauth_state;
    if (!expectedState || expectedState !== data.state) throw new Error("État OAuth invalide");

    const tokens = await exchangeCode(data.code, data.origin);
    if (!tokens.refresh_token) throw new Error("Aucun refresh_token reçu de Google. Veuillez révoquer l'accès puis réessayer.");
    const info = await fetchGoogleUserInfo(tokens.access_token);
    const enc = encryptToken(tokens.refresh_token);
    const { error } = await supabaseAdmin.from("psc_google_connections").upsert({
      user_id: context.userId,
      google_email: info.email,
      scopes: tokens.scope,
      encrypted_refresh_token: enc.ciphertext,
      encryption_iv: enc.iv,
      connected_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.auth.admin.updateUserById(context.userId, { user_metadata: { google_oauth_state: null } });
    return { ok: true, email: info.email };
  });