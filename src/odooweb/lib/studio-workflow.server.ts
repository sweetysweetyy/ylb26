import type { Ctx } from "@/lib/assistant-apps.server";
type WorkflowContext = { supabase: Ctx["db"]; userId: string };

import {
  ensureOdooModules,
  odooCall,
  odooLogin,
  odooVersion,
  upsertOdooPage,
  uploadOdooImage,
  type OdooCreds,
} from "./odoo.server";
import { resolveAppAiModel } from "@/lib/ai-models.server";
import { ow } from "./db";
import { generateImageBase64, solStructured } from "./ai.server";
import {
  buildPageHtml,
  planSchema,
  FEATURES,
  type Brief,
  type SitePlan,
  type StyleOptions,
} from "./site-plan";

type ConnectionRow = { url: string; db: string; username: string; api_key: string };

function creds(row: ConnectionRow): OdooCreds {
  return { url: row.url, db: row.db, login: row.username, apiKey: row.api_key };
}

/** Vérifie les identifiants Odoo et enregistre la connexion. */
export async function connectOdooCore({ data, context }: { data: { name: string; url: string; db: string; login: string; apiKey: string }; context: WorkflowContext }) {
    const c: OdooCreds = { url: data.url, db: data.db, login: data.login, apiKey: data.apiKey };
    const version = await odooVersion(c.url);
    const uid = await odooLogin(c);

    const modules = await odooCall<Array<{ name: string; state: string }>>(
      c,
      uid,
      "ir.module.module",
      "search_read",
      [[["name", "in", ["website", ...Object.values(FEATURES).map((f) => f.module)]]]],
      { fields: ["name", "state"] },
    );

    const url = c.url.replace(/\/+$/, "");
    const { error } = await context.supabase.from("odoo_connections").upsert(
      {
        user_id: context.userId,
        url,
        db: c.db,
        username: c.login,
        api_key: c.apiKey,
        uid,
        status: "connected",
        last_tested_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    const row = { id: context.userId, name: data.name || "Odoo (Laboratoire)", url, db_name: c.db, version, status: "connected" };

    if (error) throw new Error(error.message);
    return { connection: row, version, modules };
}


/** Analyse le brief et construit le plan du site avec GPT 5.6 Sol. */
export async function generatePlanCore({ data, context }: { data: { projectId: string }; context: WorkflowContext }) {
    const { data: project, error } = await ow(context.supabase)
      .from("ow_site_projects")
      .select("id, brief, style")
      .eq("id", data.projectId)
      .single();
    if (error || !project) throw new Error("Projet introuvable.");

    const brief = project.brief as Brief;
    const style = project.style as StyleOptions;

    const model = await resolveAppAiModel(context.supabase, context.userId, "odooweb");
    const plan = await solStructured<SitePlan>({
      model,
      schemaName: "site_plan",
      schema: planSchema(),
      instructions:
        "Tu es directeur artistique et concepteur-rédacteur web francophone. Tu conçois la structure et les textes d'un site vitrine qui sera publié dans le module Site Web d'Odoo. Écris en français, sans jargon, avec des textes concrets et spécifiques au métier du client. Slugs en minuscules, sans accents, commençant par /. La première page a le slug /accueil.",
      prompt: [
        `Entreprise : ${brief.company}`,
        `Secteur : ${brief.sector}`,
        `Objectif : ${brief.goal}`,
        `Ton : ${brief.tone}`,
        `Description libre : ${brief.description}`,
        `Nombre de pages souhaité : ${brief.pages}`,
        `Fonctionnalités : ${brief.features.join(", ") || "aucune"}`,
        `Style visuel : palette ${style.palette}, typographie ${style.typography}, densité ${style.density}, imagerie ${style.imagery}`,
        "Pour chaque page : 3 à 4 sections avec un titre et un paragraphe de 40 à 70 mots. Ajoute un libellé de bouton uniquement quand c'est pertinent. image_prompt : description en anglais d'une photo réaliste correspondant à la page, ou null.",
      ].join("\n"),
    });

    await ow(context.supabase)
      .from("ow_site_projects")
      .update({ plan, status: "planned", name: plan.site_name, progress: 40 })
      .eq("id", data.projectId);

    await ow(context.supabase).from("ow_build_logs").insert({
      user_id: context.userId,
      project_id: data.projectId,
      message: `Plan généré : ${plan.pages.length} pages`,
      detail: plan.tagline,
    });

    return plan;
}


/** Installe les modules natifs puis publie chaque page dans Odoo. */
export async function publishSiteCore({ data, context }: { data: { projectId: string }; context: WorkflowContext }) {
    const { userId } = context;
    const supabase = ow(context.supabase);

    const log = async (message: string, detail?: string, level = "info") => {
      await supabase.from("ow_build_logs").insert({
        user_id: userId,
        project_id: data.projectId,
        message,
        detail: detail ?? null,
        level,
      });
    };

    const { data: project } = await supabase
      .from("ow_site_projects")
      .select("id, plan, style, brief")
      .eq("id", data.projectId)
      .single();
    if (!project?.plan) throw new Error("Générez d'abord le plan du site.");

    const { data: connection } = await context.supabase
      .from("odoo_connections")
      .select("url, db, username, api_key")
      .eq("user_id", userId)
      .maybeSingle();
    if (!connection) throw new Error("Aucune base Odoo connectée.");

    const c = creds(connection as ConnectionRow);
    const plan = project.plan as SitePlan;
    const style = project.style as StyleOptions;
    const brief = project.brief as Brief;

    await supabase.from("ow_site_projects").update({ status: "publishing", progress: 45 }).eq("id", data.projectId);

    const uid = await odooLogin(c);
    await log("Connexion à Odoo vérifiée");

    const modules = ["website", ...brief.features.map((f) => FEATURES[f]?.module).filter(Boolean)] as string[];
    await ensureOdooModules(c, uid, modules);
    await log("Modules natifs installés", modules.join(", "));
    await supabase.from("ow_site_projects").update({ progress: 55 }).eq("id", data.projectId);

    // Nom du site via les paramètres natifs du module Site Web
    const websiteIds = await odooCall<number[]>(c, uid, "website", "search", [[]], { limit: 1 });
    if (websiteIds[0]) {
      await odooCall(c, uid, "website", "write", [[websiteIds[0]], { name: plan.site_name }]);
    }

    const created: Array<{ title: string; url: string }> = [];
    for (let i = 0; i < plan.pages.length; i++) {
      const page = plan.pages[i];
      if (!page) continue;
      let imageUrl: string | null = null;

      if (style.withImages && page.image_prompt) {
        const base64 = await generateImageBase64(
          `${page.image_prompt}. Photographic, ${style.imagery}, no text, no logo.`,
        );
        if (base64) {
          imageUrl = await uploadOdooImage(c, uid, `${page.slug.replace(/\//g, "")}.png`, base64);
          await log(`Visuel généré pour ${page.title}`);
        }
      }

      const html = buildPageHtml(page, style, imageUrl);
      const result = await upsertOdooPage(c, uid, { title: page.title, slug: page.slug, html });
      created.push({ title: page.title, url: result.url });
      await log(`Page publiée : ${page.title}`, result.url);
      await supabase
        .from("ow_site_projects")
        .update({ progress: 55 + Math.round(((i + 1) / plan.pages.length) * 45) })
        .eq("id", data.projectId);
    }

    await supabase.from("ow_site_projects").update({ status: "published", progress: 100 }).eq("id", data.projectId);
    await log("Site publié dans Odoo", `${created.length} pages`, "success");

    return { siteUrl: c.url, pages: created };
}

