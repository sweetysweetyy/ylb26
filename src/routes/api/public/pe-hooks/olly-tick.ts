import { createFileRoute } from "@tanstack/react-router";

/** Central scheduler endpoint. Each active prospection keeps its own due date. */
export const Route = createFileRoute("/api/public/pe-hooks/olly-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        try {
          const { runDueProspections } = await import("@/prospect/lib/engine.server");
          const results = await runDueProspections(12);
          return Response.json({ ok: true, processed: results.length, results });
        } catch (error) {
          console.error("olly-tick failed", error);
          return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
        }
      },
    },
  },
});
