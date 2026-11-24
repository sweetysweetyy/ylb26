import { fo } from "@/facturodoo/lib/db";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OdooScope } from "./invoice-types";
import type { Json } from "@/facturodoo/types";

const ConnectionInput = z.object({
  url: z.string().min(4),
  db: z.string().min(1),
  username: z.string().min(1),
  apiKey: z.string().min(1).optional(), // absent = conserver la clé existante
});

/** Enregistre la connexion Odoo après l'avoir testée (login + scopes). */
export const saveOdooConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ConnectionInput.parse(i))
  .handler(async ({ data, context }) => {
    const { OdooClient, checkScopes, encryptSecret, decryptSecret, normalizeUrl } = await import("./odoo.server");
    const { supabase, userId } = context;

    let apiKey = data.apiKey;
    if (!apiKey) {
      const { data: existing } = await fo(supabase).from("odoo_connections").select("api_key").eq("user_id", userId).maybeSingle();
      if (!existing) throw new Error("Veuillez saisir votre clé API Odoo.");
      apiKey = await decryptSecret(existing.api_key);
    }

    const url = normalizeUrl(data.url);
    const client = new OdooClient({ url, db: data.db.trim(), username: data.username.trim(), apiKey });
    const uid = await client.login();
    const [version, me, scopes] = await Promise.all([
      client.version().catch(() => ({ server_version: undefined })),
      client.call<{ name: string; company_id: [number, string] | false }[]>("res.users", "read", [[uid]], { fields: ["name", "company_id"] }),
      checkScopes(client),
    ]);

    const row = {
      user_id: userId,
      url,
      db: data.db.trim(),
      username: data.username.trim(),
      api_key: await encryptSecret(apiKey),
      uid: uid,
      status: "connected",
      modules: scopes as unknown as Json,
      last_tested_at: new Date().toISOString(),
    };
    const { error } = await fo(supabase).from("odoo_connections").upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true, uid, version: version.server_version ?? null, company: me[0]?.company_id ? me[0].company_id[1] : null, scopes };
  });

/** Re-teste la connexion enregistrée. */
export const testOdooConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { OdooClient, checkScopes, decryptSecret } = await import("./odoo.server");
    const { supabase, userId } = context;
    const { data: conn } = await fo(supabase).from("odoo_connections").select("*").eq("user_id", userId).maybeSingle();
    if (!conn) throw new Error("Aucune connexion Odoo configurée.");
    const client = new OdooClient({ url: conn.url, db: conn.db, username: conn.username, apiKey: await decryptSecret(conn.api_key) });
    await client.login();
    const scopes: OdooScope[] = await checkScopes(client);
    await supabase
      .from("odoo_connections")
      .update({ modules: scopes as unknown as Json, last_tested_at: new Date().toISOString() })
      .eq("user_id", userId);
    return { ok: true, scopes };
  });
