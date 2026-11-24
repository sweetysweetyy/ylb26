import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const StepSchema = z.object({
  delay_hours: z.number().min(0),
  angle: z.string(),
  instruction: z.string(),
});
const PlanInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string(),
  trigger: z.enum(["no_reply", "angry", "ghosted", "objection", "interested_but_wait"]),
  steps: z.array(StepSchema),
  active: z.boolean(),
});

export const listActionPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    let { data } = await context.supabase.from("psc_action_plans").select("*").eq("user_id", context.userId).order("created_at", { ascending: true });
    if (!data || data.length === 0) {
      await seedDefaults(context.userId, context.supabase);
      const r = await context.supabase.from("psc_action_plans").select("*").eq("user_id", context.userId).order("created_at", { ascending: true });
      data = r.data;
    }
    return data ?? [];
  });

async function seedDefaults(userId: string, supabase: any) {
  const defaults = [
    {
      user_id: userId, name: "Relance douce", description: "Prospect qui ne répond pas — 3 relances progressives",
      trigger: "no_reply", is_default: true, active: true,
      steps: [
        { delay_hours: 48, angle: "rappel bref", instruction: "Rappelle l'objet, propose un créneau précis." },
        { delay_hours: 96, angle: "preuve sociale", instruction: "Apporte un cas client concret, résultat chiffré." },
        { delay_hours: 168, angle: "breakup courtois", instruction: "Demande s'il n'est pas le bon moment, laisse la porte ouverte." },
      ],
    },
    {
      user_id: userId, name: "Apaisement (prospect énervé)", description: "Le prospect est agacé — on baisse la tension puis on repart doucement",
      trigger: "angry", is_default: true, active: true,
      steps: [
        { delay_hours: 48, angle: "silence + empathie", instruction: "Message très court d'excuses, aucun pitch, aucune demande." },
        { delay_hours: 120, angle: "valeur gratuite", instruction: "Envoie un contenu utile (article, étude) sans rien demander." },
        { delay_hours: 240, angle: "reprise soft", instruction: "Reprends la conversation, propose un échange court sans pression." },
      ],
    },
    {
      user_id: userId, name: "Ghosting", description: "Prospect qui a répondu puis disparu",
      trigger: "ghosted", is_default: true, active: true,
      steps: [
        { delay_hours: 72, angle: "questionnement", instruction: "Une seule question ouverte pour relancer." },
        { delay_hours: 168, angle: "nouvelle angle", instruction: "Change d'angle : bénéfice différent, cas client." },
        { delay_hours: 336, angle: "breakup avec ouverture", instruction: "Ferme le dossier tout en laissant la porte ouverte." },
      ],
    },
    {
      user_id: userId, name: "Objection prix/timing", description: "Le prospect a une objection",
      trigger: "objection", is_default: true, active: true,
      steps: [
        { delay_hours: 24, angle: "reformulation + preuve", instruction: "Reformule l'objection, apporte une preuve concrète." },
        { delay_hours: 96, angle: "cas client similaire", instruction: "Story d'un client qui avait la même objection et a converti." },
        { delay_hours: 240, angle: "petit engagement", instruction: "Propose un premier pas gratuit (audit, appel 15min)." },
      ],
    },
    {
      user_id: userId, name: "Intéressé mais pas maintenant", description: "Nurturing longue durée",
      trigger: "interested_but_wait", is_default: true, active: true,
      steps: [
        { delay_hours: 336, angle: "check-in valeur", instruction: "Envoie une info sectorielle utile, aucune vente." },
        { delay_hours: 720, angle: "actualité produit", instruction: "Annonce une nouveauté qui peut intéresser." },
        { delay_hours: 1440, angle: "invitation directe", instruction: "Propose un moment court pour reparler." },
      ],
    },
  ];
  for (const p of defaults) await supabase.from("psc_action_plans").insert(p);
}

export const upsertActionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("psc_action_plans").update(rest as never).eq("id", id).eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("psc_action_plans").insert({ user_id: context.userId, ...rest } as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteActionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("psc_action_plans").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });