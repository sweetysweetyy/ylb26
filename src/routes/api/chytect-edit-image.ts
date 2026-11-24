import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { editImage, imageSettings } from "@/chytect/lib/image-gateway.server";

async function isSignedIn(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env["SUPABASE_URL"] || "https://mlwrhfpgwyxrnbqdbdqg.supabase.co";
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_XNhP6c8MQ4f-rM6d7mkOfQ_hdQkZ_sB";
  if (!token) return false;
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  return !error && Boolean(data?.user?.id);
}

export const Route = createFileRoute("/api/chytect-edit-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isSignedIn(request))) return new Response("Non autorisé", { status: 401 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Lovable AI n'est pas configuré.", { status: 500 });
        const form = await request.formData();
        const upstream = await editImage({ ...imageSettings, apiKey }, form);
        return new Response(upstream.body, {
          status: upstream.status,
          headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
