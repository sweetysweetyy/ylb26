/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEnvMailgunConfig, normalizeApiBase } from "@/lib/mailgun.server";

export const getMailgunConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("mailgun_connections")
      .select("domain, api_base, from_name, from_email, api_key, signing_key")
      .eq("user_id", context.userId)
      .maybeSingle();

    const env = getEnvMailgunConfig();
    return {
      connected: Boolean(data?.domain && data?.api_key),
      domain: data?.domain ?? "",
      apiBase: data?.api_base ?? "https://api.mailgun.net",
      fromName: data?.from_name ?? "",
      fromEmail: data?.from_email ?? "",
      hasApiKey: Boolean(data?.api_key),
      hasSigningKey: Boolean(data?.signing_key),
      hasEnvFallback: Boolean(env),
    };
  });

const SaveMailgunSchema = z.object({
  domain: z.string().trim().min(3, "Domaine Mailgun requis").max(255),
  apiKey: z.string().trim().max(500).optional().default(""),
  signingKey: z.string().trim().max(500).optional().default(""),
  apiBase: z.string().trim().url("URL d'API invalide").max(255).optional().default("https://api.mailgun.net"),
  fromName: z.string().trim().max(120).optional().default(""),
  fromEmail: z.string().trim().max(255).optional().default(""),
});

export const saveMailgunConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveMailgunSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await (context.supabase as any)
      .from("mailgun_connections")
      .select("api_key, signing_key")
      .eq("user_id", context.userId)
      .maybeSingle();

    const apiKey = data.apiKey || existing?.api_key || "";
    if (!apiKey) throw new Error("La clé API Mailgun est requise.");

    const signingKey = data.signingKey || existing?.signing_key || null;
    const { error } = await (context.supabase as any)
      .from("mailgun_connections")
      .upsert(
        {
          user_id: context.userId,
          domain: data.domain.toLowerCase(),
          api_key: apiKey,
          signing_key: signingKey,
          api_base: normalizeApiBase(data.apiBase),
          from_name: data.fromName || null,
          from_email: data.fromEmail || null,
          status: "active",
        },
        { onConflict: "user_id" },
      );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMailgunConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await (context.supabase as any)
      .from("mailgun_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });