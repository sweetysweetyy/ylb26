import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Reads the Laboratory's shared Google connection (no separate sign-in for Prospect Engine). */
export const getGoogleStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("google_connections")
      .select("google_email, scope, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    const scope = data?.scope ?? "";
    const gmail = /gmail\.(modify|send)/.test(scope);
    return { connected: Boolean(data), email: data?.google_email ?? null, gmail, updatedAt: data?.created_at ?? null };
  });
