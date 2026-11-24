import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    return data;
  });

export const setWallpaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ background_url: z.string().nullable(), background_opacity: z.number().min(0).max(1).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { background_url: string | null; background_opacity?: number } = { background_url: data.background_url };
    if (typeof data.background_opacity === "number") patch.background_opacity = data.background_opacity;
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });