import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/feeloo-google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // signed state
        if (!code || !state) return new Response("Paramètres manquants", { status: 400 });
        let userId: string;
        try {
          const { verifyOAuthState } = await import("@/lib/google.server");
          const verified = await verifyOAuthState(state);
          if (verified.ret !== "/api/public/feeloo-google/callback") throw new Error("Invalid state");
          userId = verified.uid;
        } catch { return new Response("État invalide", { status: 400 }); }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) return new Response("Google non configuré", { status: 500 });
        const redirect_uri = `${url.origin}/api/public/feeloo-google/callback`;
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri, grant_type: "authorization_code" }),
        });
        if (!tokenRes.ok) return new Response(`Échec OAuth: ${await tokenRes.text()}`, { status: 502 });
        const tok = await tokenRes.json();
        // Fetch email
        let email: string | null = null;
        try {
          const meRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } });
          if (meRes.ok) email = (await meRes.json()).email ?? null;
        } catch {}
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("fl_google_connections").upsert({
          user_id: userId,
          refresh_token: tok.refresh_token,
          access_token: tok.access_token,
          expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
          scope: tok.scope,
          email,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        return new Response(null, { status: 302, headers: { Location: "/feeloo/integrations?connected=1" } });
      },
    },
  },
});