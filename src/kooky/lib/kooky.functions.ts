import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ky } from "@/kooky/lib/db";
import { toKyConn } from "@/kooky/types";

const ConnInput = z.object({
  url: z.string().min(4),
  db: z.string().min(1),
  login: z.string().min(3),
  apiKey: z.string().min(8),
});

export type OdooCheck = {
  ok: boolean;
  uid?: number;
  version?: string;
  crmInstalled?: boolean;
  rights?: Record<string, Record<string, boolean>>;
  error?: string;
};

/** Saves the Odoo connection and verifies it (auth + native CRM/Contacts access rights). */
export const saveOdooConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConnInput.parse(input))
  .handler(async ({ data, context }): Promise<OdooCheck> => {
    const { OdooClient, normalizeOdooUrl } = await import("@/kooky/lib/odoo.server");
    const url = normalizeOdooUrl(data.url);
    const client = new OdooClient({ url, db: data.db.trim(), login: data.login.trim(), apiKey: data.apiKey.trim() });
    let result: OdooCheck;
    try {
      const uid = await client.authenticate();
      const [version, access] = await Promise.all([client.version().catch(() => "inconnue"), client.checkAccess()]);
      result = { ok: true, uid, version, crmInstalled: access.crmInstalled, rights: access.rights };
    } catch (err) {
      result = { ok: false, error: err instanceof Error ? err.message : "Connexion impossible" };
    }
    const { error } = await ky(context.supabase).from("odoo_connections").upsert(
      {
        user_id: context.userId,
        url,
        db: data.db.trim(),
        username: data.login.trim(),
        api_key: data.apiKey.trim(),
        uid: result.uid ?? null,
        status: result.ok ? (result.crmInstalled ? "connected" : "no_crm") : "error",
        status_message: result.error ?? null,
        last_tested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return result;
  });

/** Re-tests the stored connection. */
export const testOdooConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OdooCheck> => {
    const { data: row } = await ky(context.supabase).from("odoo_connections").select("*").eq("user_id", context.userId).maybeSingle();
    const conn = toKyConn(row);
    if (!conn) return { ok: false, error: "Aucune connexion enregistrée." };
    const { OdooClient } = await import("@/kooky/lib/odoo.server");
    const client = new OdooClient({ url: conn.url, db: conn.db_name, login: conn.login, apiKey: conn.api_key });
    let result: OdooCheck;
    try {
      const uid = await client.authenticate();
      const [version, access] = await Promise.all([client.version().catch(() => "inconnue"), client.checkAccess()]);
      result = { ok: true, uid, version, crmInstalled: access.crmInstalled, rights: access.rights };
    } catch (err) {
      result = { ok: false, error: err instanceof Error ? err.message : "Connexion impossible" };
    }
    await ky(context.supabase)
      .from("odoo_connections")
      .update({
        uid: result.uid ?? null,
        status: result.ok ? (result.crmInstalled ? "connected" : "no_crm") : "error",
        status_message: result.error ?? null,
        last_tested_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);
    return result;
  });
