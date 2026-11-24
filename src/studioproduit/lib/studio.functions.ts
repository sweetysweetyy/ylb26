import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { analyzeCore, planCore, renderCore, type Settings } from "./pipeline.server";

export type { Analysis, Settings } from "./pipeline.server";

/** Étape 1 — Sol analyse la photo, identifie le produit et cherche les tendances. */
export const analyzeShoot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { shootId: string }) => input)
  .handler(async ({ data, context }) => analyzeCore(context.supabase, data.shootId));

/** Étape 2 — Sol construit la série logique de 5 photos et les prompts de rendu. */
export const planShoot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { shootId: string; settings: Settings }) => input)
  .handler(async ({ data, context }) =>
    planCore(context.supabase, data.shootId, context.userId, data.settings),
  );

/** Étape 3 — GPT-image rend une photo à partir du prompt, en gardant le vrai produit. */
export const renderShot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { shotId: string }) => input)
  .handler(async ({ data, context }) => {
    const result = await renderCore(context.supabase, context.userId, data.shotId);

    // Si la séance vient de Google Drive et que les 5 photos sont prêtes, on livre tout de suite.
    const { data: shot } = await (context.supabase as any)
      .from("sp_shots")
      .select("shoot_id")
      .eq("id", data.shotId)
      .maybeSingle();
    if (shot?.shoot_id) {
      try {
        const { deliverShootIfComplete } = await import("./drive-pipeline.server");
        await deliverShootIfComplete(context.userId, shot.shoot_id);
      } catch {
        /* la livraison sera retentée au prochain passage automatique */
      }
    }
    return result;
  });
