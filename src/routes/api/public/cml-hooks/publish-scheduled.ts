import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cml-hooks/publish-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processDue } = await import("@/cml/lib/linkedin-queue.server");
        try {
          const res = await processDue(supabaseAdmin, 15);
          return Response.json({ ok: true, ...res, at: new Date().toISOString() });
        } catch (e: any) {
          return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
        }
      },
      GET: async () => Response.json({ ok: true, service: "publish-scheduled" }),
    },
  },
});
