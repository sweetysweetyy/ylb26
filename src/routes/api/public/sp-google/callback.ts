/** Retour d'autorisation Google : enregistre le compte Drive de l'utilisateur. */
import { createFileRoute } from "@tanstack/react-router";

function back(origin: string, params: Record<string, string>) {
  const url = new URL("/studioproduit/dashboard", origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

export const Route = createFileRoute("/api/public/sp-google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) return back(origin, { drive: "error", message: error });
        if (!code || !state) return back(origin, { drive: "error", message: "Réponse Google incomplète." });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { exchangeCode, getGoogleEmail } = await import("@/studioproduit/lib/google-drive.server");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const db = supabaseAdmin as any;

          const { data: row } = await db
            .from("sp_oauth_states")
            .select("user_id, created_at")
            .eq("state", state)
            .maybeSingle();
          if (!row) return back(origin, { drive: "error", message: "Session d'autorisation expirée." });
          await db.from("sp_oauth_states").delete().eq("state", state);

          const tokens = await exchangeCode(code, origin);
          const email = await getGoogleEmail(tokens.access_token);
          const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

          const patch: Record<string, unknown> = {
            user_id: row.user_id,
            google_email: email,
            access_token: tokens.access_token,
            access_token_expires_at: expiresAt,
            last_error: null,
          };
          if (tokens.refresh_token) patch["refresh_token"] = tokens.refresh_token;

          const { data: existing } = await db
            .from("sp_drive_accounts")
            .select("user_id")
            .eq("user_id", row.user_id)
            .maybeSingle();

          if (existing) {
            const { user_id: _omit, ...update } = patch as { user_id: string };
            void _omit;
            const res = await db.from("sp_drive_accounts").update(update).eq("user_id", row.user_id);
            if (res.error) throw new Error(res.error.message);
          } else {
            if (!tokens.refresh_token) {
              return back(origin, {
                drive: "error",
                message: "Google n'a pas renvoyé d'autorisation durable. Réessayez.",
              });
            }
            const res = await db.from("sp_drive_accounts").insert(patch);
            if (res.error) throw new Error(res.error.message);
          }

          return back(origin, { drive: "connected" });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Connexion Google impossible.";
          return back(origin, { drive: "error", message });
        }
      },
    },
  },
});
