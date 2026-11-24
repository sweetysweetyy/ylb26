import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ToolSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  kind: z.string().min(1).max(80),
  description: z.string().max(2000).optional().nullable(),
  config: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(true),
});

export const listTools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("psc_agent_tools").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ToolSchema.parse(i))
  .handler(async ({ data, context }) => {
    const row = { ...data, user_id: context.userId, description: data.description ?? null };
    if (data.id) {
      const { error } = await context.supabase.from("psc_agent_tools").update(row as never).eq("id", data.id).eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("psc_agent_tools").insert(row as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("psc_agent_tools").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const TOOL_CATALOG = [
  { kind: "webhook", label: "Webhook sortant", description: "POST JSON vers une URL externe", fields: ["url", "auth_header"] },
  { kind: "http_api", label: "API HTTP", description: "Appel REST générique (GET/POST/PUT/DELETE)", fields: ["base_url", "auth_header"] },
  { kind: "slack", label: "Notification Slack", description: "Envoyer un message dans un canal Slack", fields: ["webhook_url", "channel"] },
  { kind: "notion", label: "Notion", description: "Créer/mettre à jour des pages Notion", fields: ["token", "database_id"] },
  { kind: "airtable", label: "Airtable", description: "Lecture/écriture d'une base Airtable", fields: ["api_key", "base_id", "table"] },
  { kind: "hubspot", label: "HubSpot", description: "Synchroniser les prospects avec HubSpot", fields: ["access_token"] },
  { kind: "stripe", label: "Stripe", description: "Créer des liens de paiement / vérifier les factures", fields: ["secret_key"] },
  { kind: "calendly", label: "Calendly", description: "Récupérer les liens de RDV disponibles", fields: ["access_token"] },
  { kind: "sms_twilio", label: "SMS Twilio", description: "Envoyer un SMS de rappel au prospect", fields: ["account_sid", "auth_token", "from_number"] },
  { kind: "whatsapp", label: "WhatsApp Cloud API", description: "Envoyer un WhatsApp de rappel", fields: ["access_token", "phone_number_id"] },
  { kind: "custom", label: "Outil personnalisé", description: "Décris l'outil pour que PASCAL sache l'utiliser", fields: [] },
] as const;