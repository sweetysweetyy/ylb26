import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Odoo credentials live in the shared Laboratory `odoo_connections` row.
const credsSchema = z.object({
  url: z.string().url(),
  db: z.string().min(1),
  login: z.string().min(1),
  api_key: z.string().min(1),
});

export const saveOdooSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => credsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { odooClient } = await import("./odoo.server");
    const { uid } = await odooClient(data); // throws if invalid
    const { error } = await context.supabase.from("odoo_connections").upsert(
      { user_id: context.userId, url: data.url.replace(/\/+$/, ""), db: data.db, username: data.login, api_key: data.api_key, uid, status: "connected", updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadCreds(supabase: any, userId: string) {
  const { data } = await supabase.from("odoo_connections").select("url, db, username, api_key").eq("user_id", userId).maybeSingle();
  return data ? { url: data.url as string, db: data.db as string, login: data.username as string, api_key: data.api_key as string } : null;
}

export const getRegisterState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const creds = await loadCreds(context.supabase, context.userId);
    if (!creds) return { connected: false as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: st } = await sb.from("cv_session_state").select("session_id").eq("user_id", context.userId).maybeSingle();
    try {
      const { odooClient, sessionSummary } = await import("./odoo.server");
      const odoo = await odooClient(creds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configs = await odoo.call<any[]>("pos.config", "search_read", [[]], { fields: ["id", "name", "current_session_state"] });
      const session = st?.session_id ? await sessionSummary(odoo, st.session_id) : null;
      return {
        connected: true as const,
        url: creds.url,
        configs: configs.map((c) => ({ id: c.id as number, name: String(c.name), state: String(c.current_session_state || "") })),
        session: session && session.state !== "closed" ? JSON.parse(JSON.stringify(session)) as {
          name: string; config: string; state: string; balance: number; total_sales: number; orders: number;
        } : null,
      };
    } catch (e) {
      return { connected: true as const, url: creds.url, error: (e as Error).message, configs: [], session: null };
    }
  });

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { runAssistant } = await import("./assistant.server");
    return runAssistant(context, data.text);
  });
