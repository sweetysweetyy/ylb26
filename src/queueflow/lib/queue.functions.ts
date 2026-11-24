import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { qf } from "@/queueflow/lib/db";

const slugSchema = z.object({ slug: z.string().trim().min(4).max(64) });

export const joinSchema = z.object({
  slug: z.string().trim().min(4).max(64),
  full_name: z.string().trim().min(2, "Nom trop court").max(80),
  phone: z.string().trim().min(6, "Téléphone invalide").max(30),
  email: z.string().trim().email("Email invalide").max(160).or(z.literal("")),
  reason: z.string().trim().max(300),
});

export type JoinInput = z.infer<typeof joinSchema>;

export const getPublicQueue = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => slugSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: queue } = await qf(supabaseAdmin)
      .from("qf_queues")
      .select("id, name, is_active, business_name")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!queue) return null;

    const { count } = await qf(supabaseAdmin)
      .from("qf_queue_entries")
      .select("id", { count: "exact", head: true })
      .eq("queue_id", queue.id)
      .eq("status", "waiting");

    return {
      name: queue.name,
      is_active: queue.is_active,
      business_name: queue.business_name ?? "",
      waiting: count ?? 0,
    };
  });

export const joinQueue = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => joinSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: queue } = await qf(supabaseAdmin)
      .from("qf_queues")
      .select("id, is_active")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!queue) throw new Error("File d'attente introuvable.");
    if (!queue.is_active) throw new Error("Cette file d'attente est actuellement fermée.");

    const { data: entry, error } = await qf(supabaseAdmin)
      .from("qf_queue_entries")
      .insert({
        queue_id: queue.id,
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        reason: data.reason || null,
      })
      .select("id")
      .single();
    if (error) throw new Error("Impossible de rejoindre la file. Réessayez.");
    return { id: entry.id as string };
  });

export const getTicket = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: entry } = await qf(supabaseAdmin)
      .from("qf_queue_entries")
      .select("id, full_name, status, ticket_number, sort_order, queue_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!entry) return null;

    const [{ count }, { data: queue }] = await Promise.all([
      qf(supabaseAdmin)
        .from("qf_queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("queue_id", entry.queue_id)
        .eq("status", "waiting")
        .lt("sort_order", entry.sort_order),
      qf(supabaseAdmin).from("qf_queues").select("name").eq("id", entry.queue_id).maybeSingle(),
    ]);

    return {
      full_name: entry.full_name as string,
      status: entry.status as string,
      ticket_number: entry.ticket_number as number,
      ahead: count ?? 0,
      queue_name: queue?.name ?? "",
    };
  });
