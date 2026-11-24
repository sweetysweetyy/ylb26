import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/feeloo-hooks/sync-sheets")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!apikey || !expected || apikey !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
        const { runSyncForAllUsers } = await import("@/feeloo/lib/sync-engine.server");
        try {
          const results = await runSyncForAllUsers("sheets");
          return Response.json({ ok: true, results });
        } catch (e: any) {
          console.error("cron sheets", e);
          return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
        }
      },
    },
  },
});
