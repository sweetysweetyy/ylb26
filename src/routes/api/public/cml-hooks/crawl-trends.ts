import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cml-hooks/crawl-trends")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_ANON_KEY) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { crawlTrends } = await import("@/cml/lib/trends.server");
        try {
          const res = await crawlTrends(supabaseAdmin);
          return Response.json({ ok: true, ...res, at: new Date().toISOString() });
        } catch (e: any) {
          return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
        }
      },
      GET: async () => Response.json({ ok: true, service: "crawl-trends" }),
    },
  },
});
