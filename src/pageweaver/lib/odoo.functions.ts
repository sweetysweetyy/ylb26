import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Publishes the finished Page Weaver page as the Odoo website homepage, using the shared Laboratory Odoo connection. */
export const publishToOdoo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ title: z.string().max(200), html: z.string().min(1).max(2_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: conn } = await context.supabase
      .from("odoo_connections").select("url, db, username, api_key").eq("user_id", context.userId).maybeSingle();
    if (!conn) return { ok: false as const, error: "Aucune connexion Odoo. Ajoutez-la dans les Paramètres du Laboratoire." };
    const { publishHomepage } = await import("./odoo.server");
    try {
      const r = await publishHomepage({ url: conn.url, db: conn.db, login: conn.username, apiKey: conn.api_key }, { title: data.title || "Accueil", html: data.html });
      return { ok: true as const, url: r.url };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Publication impossible." };
    }
  });
