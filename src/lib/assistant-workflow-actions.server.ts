import { z } from "zod";
import type { Action, Ctx } from "./assistant-apps.server";
import { copySource, insertOwned, owned, readSource, sourceText } from "./automation-sources.server";

const id = z.string().uuid();
const text = z.string().trim().min(1);
const sourceFields = { source_file_id: id.optional(), contenu_source: text.optional() };
const context = (ctx: Ctx) => ({ supabase: ctx.db, userId: ctx.userId });
const done = (id: string, open: string, extra: Record<string, unknown> = {}) => ({ id, open, ...extra });

export const workflowActions: Record<string, Record<string, Action>> = {
  facturodoo: {
    importer_facture: {
      description: "Importer une vraie facture PDF depuis Sky Cloud (source_file_id obtenu par nouveaux_fichiers), copier le PDF et lancer l'extraction FacturOdoo. Réutilise une facture déjà importée. Ne l'envoie pas automatiquement dans Odoo.",
      input: z.object({ source_file_id: id }),
      run: async (ctx, i) => {
        const source = await readSource(ctx, i.source_file_id, "pdf");
        const path = `${ctx.userId}/sky-${source.id}.pdf`;
        const { data: existing, error } = await ctx.db.from("fo_invoices").select("id,status,extracted").eq("user_id", ctx.userId).eq("storage_path", path).maybeSingle();
        if (error) throw new Error(error.message);
        const inv = existing ?? await insertOwned(ctx, "fo_invoices", { file_name: source.name, storage_path: path, status: "analyzing" });
        if (["created", "review"].includes(inv.status)) return done(inv.id, `/facturodoo/factures/${inv.id}`, { status: inv.status, deja_importee: true });
        await copySource(ctx, source, "facturodoo-invoices", path);
        const { analyzeInvoiceCore } = await import("@/facturodoo/lib/invoices-workflow.server");
        const result = await analyzeInvoiceCore({ context: context(ctx), data: { invoiceId: inv.id } });
        return done(inv.id, `/facturodoo/factures/${inv.id}`, { status: "review", ...result });
      },
    },
    envoyer_odoo: {
      description: "Envoyer dans Odoo une facture FacturOdoo déjà analysée, uniquement si la mission autorise explicitement cet envoi. Respecte la protection native contre un second envoi.",
      input: z.object({ invoice_id: id, create_purchase_order: z.boolean().optional() }),
      run: async (ctx, i) => {
        const inv = await owned(ctx, "fo_invoices", i.invoice_id);
        if (inv.status !== "review" || !inv.extracted) throw new Error("La facture doit d'abord être analysée et prête pour revue.");
        const { pushInvoiceToOdooCore } = await import("@/facturodoo/lib/invoices-workflow.server");
        const result = await pushInvoiceToOdooCore({ context: context(ctx), data: { invoiceId: inv.id, extracted: inv.extracted, partnerId: inv.supplier_match?.best?.id ?? null, createPurchaseOrder: i.create_purchase_order ?? false, attachPdf: true } });
        return done(inv.id, `/facturodoo/factures/${inv.id}`, result);
      },
    },
  },
  prospect: {
    ajouter_entreprise: {
      description: "Enregistrer une entreprise cible à partir des données d'une autre app (CRM, recherche, document). Ne lance pas d'envoi d'email.",
      input: z.object({ name: text, sector: text.optional(), city: text.optional(), website: z.string().url().optional(), email: z.string().email().optional(), phone: text.optional() }),
      run: async (ctx, i) => { const row = await insertOwned(ctx, "pe_companies", i); return done(row.id, "/prospect"); },
    },
    lancer_prospection: {
      description: "Lancer OLLY pour une entreprise existante. Peut envoyer un email selon les réglages OLLY : utiliser uniquement si la mission autorise la prospection.",
      input: z.object({ company_id: id }),
      run: async (ctx, i) => {
        await owned(ctx, "pe_companies", i.company_id);
        const { startProspection } = await import("@/prospect/lib/engine.server");
        const result = await startProspection(ctx.userId, i.company_id);
        return { prospection_id: result.prospectionId, sent: result.sent, subject: result.draft.subject, open: "/prospect" };
      },
    },
  },
  kooky: {
    creer_lead: {
      description: "Créer un vrai lead KOOKY depuis une fiche source, avec son dossier de recherche obligatoire. search_id facultatif : crée un dossier d'import si absent.",
      input: z.object({ company_name: text, sector: text, search_id: id.optional(), city: text.optional(), email: z.string().email().optional(), phone: text.optional(), website: z.string().url().optional(), summary: text.optional() }),
      run: async (ctx, i) => {
        const { search_id, ...lead } = i;
        const search = search_id ? await owned(ctx, "ky_lead_searches", search_id) : await insertOwned(ctx, "ky_lead_searches", { sector: i.sector, location: i.city ?? null, brief: "Import depuis une automatisation", status: "completed", target_count: 1 });
        const row = await insertOwned(ctx, "ky_leads", { ...lead, search_id: search.id });
        return done(row.id, "/kooky", { search_id: search.id });
      },
    },
  },
  nexusjob: {
    ajouter_offre: {
      description: "Sauvegarder une vraie offre d'emploi fournie par une source, avec son URL obligatoire.",
      input: z.object({ title: text, url: z.string().url(), company: text.optional(), location: text.optional(), description: text.optional() }),
      run: async (ctx, i) => { const row = await insertOwned(ctx, "nxj_offers", { ...i, source: "automation" }); return done(row.id, "/nexusjob/offers"); },
    },
    rechercher_offres: {
      description: "Lancer le moteur natif NexusJob avec le profil enregistré, les critères et les sources demandées. Les services de recherche doivent être configurés.",
      input: z.object({ brief: text, sources: z.array(text).optional() }),
      run: async (ctx, i) => {
        const { runSearchPipeline } = await import("@/nexusjob/lib/search.server");
        return { ...await runSearchPipeline(ctx.db, ctx.userId, i), open: "/nexusjob/offers" };
      },
    },
  },
  dyap: {
    creer_presentation: {
      description: "Analyser un CSV réel Sky Cloud ou le contenu fourni par une action précédente et générer une présentation Dyap complète avec ses slides. Ne pas inventer les chiffres.",
      input: z.object({ ...sourceFields, titre: text }),
      run: async (ctx, i) => {
        const csvData = await sourceText(ctx, i);
        const { dyapAnalyzeCore } = await import("@/dyap/lib/dyap-workflow.server");
        const result = await dyapAnalyzeCore({ context: context(ctx), data: { csvData: csvData.slice(0, 15000), fileName: i.titre } });
        return done(result.presentation.id, "/dyap/dashboard", { title: result.presentation.title, status: result.presentation.status });
      },
    },
  },
  studioproduit: {
    creer_shoot: {
      description: "Importer une vraie photo de produit Sky Cloud, analyser le produit et préparer sa série de photos. Le rendu est une action distincte.",
      input: z.object({ source_file_id: id, consignes: text.optional() }),
      run: async (ctx, i) => {
        const source = await readSource(ctx, i.source_file_id, "image");
        const path = `${ctx.userId}/automation/${source.id}/original`;
        await copySource(ctx, source, "studioproduit-photos", path);
        const row = await insertOwned(ctx, "sp_shoots", { product_name: source.name, source_path: path, status: "uploaded" });
        const { analyzeCore, planCore, DEFAULT_SETTINGS } = await import("@/studioproduit/lib/pipeline.server");
        await analyzeCore(ctx.db, row.id);
        const plan = await planCore(ctx.db, row.id, ctx.userId, { ...DEFAULT_SETTINGS, notes: i.consignes ?? "" });
        return done(row.id, "/studioproduit", { shots: plan.shots, concept: plan.concept });
      },
    },
    rendre_photo: {
      description: "Rendre une photo Studio Produit préparée, à partir du shot_id renvoyé par creer_shoot. Consomme une génération d'image.",
      input: z.object({ shot_id: id }),
      run: async (ctx, i) => {
        const shot = await owned(ctx, "sp_shots", i.shot_id);
        await owned(ctx, "sp_shoots", shot.shoot_id);
        const { renderCore } = await import("@/studioproduit/lib/pipeline.server");
        return { ...await renderCore(ctx.db, ctx.userId, i.shot_id), open: "/studioproduit" };
      },
    },
  },
  pageweaver: {
    creer_projet: {
      description: "Créer et générer une page Page Weaver à partir d'un brief extrait d'une autre app ou d'un fichier texte Sky Cloud. Enregistre le projet, les sections et leurs vrais aperçus HTML.",
      input: z.object({ ...sourceFields, titre: text }),
      run: async (ctx, i) => {
        const brief = (await sourceText(ctx, i)).slice(0, 6000);
        const { analyzeBriefCore, generateSectionCore } = await import("@/pageweaver/lib/ai-workflow.server");
        const analysis = await analyzeBriefCore({ context: context(ctx), data: { brief } });
        const row = await insertOwned(ctx, "pw_projects", { name: i.titre, brief, design: analysis.design });
        const htmls: string[] = [];
        for (const [index, section] of analysis.sections.entries()) {
          const generated = await generateSectionCore({ context: context(ctx), data: { brief, design: analysis.design, title: section.title, description: section.description, config: {}, neighbors: analysis.sections.map((s) => s.title) } });
          await insertOwned(ctx, "pw_sections", { project_id: row.id, ...section, html: generated.html, status: "ready", in_page: true, page_order: index, x: 0, y: index * 420 });
          htmls.push(generated.html);
        }
        const { buildDocument } = await import("@/pageweaver/lib/doc");
        const { error } = await ctx.db.from("pw_projects").update({ page_html: buildDocument(htmls.join("\n"), analysis.design) }).eq("id", row.id).eq("user_id", ctx.userId);
        if (error) throw new Error(error.message);
        return done(row.id, `/pageweaver/project/${row.id}`, { sections: htmls.length });
      },
    },
  },
  odooweb: {
    creer_site: {
      description: "Concevoir un vrai plan de site Odoo depuis le brief fourni par une autre app ou un fichier texte. La publication sur Odoo reste une action distincte.",
      input: z.object({ ...sourceFields, entreprise: text, secteur: text, objectif: text, pages: z.number().int().min(1).max(6).optional() }),
      run: async (ctx, i) => {
        const description = await sourceText(ctx, i);
        const { PALETTES } = await import("@/odooweb/lib/site-plan");
        const palette = PALETTES["azur"];
        if (!palette) throw new Error("Style du site indisponible.");
        const row = await insertOwned(ctx, "ow_site_projects", { name: i.entreprise, brief: { company: i.entreprise, sector: i.secteur, goal: i.objectif, tone: "professionnel", description, pages: i.pages ?? 3, features: [] }, style: { palette: "azur", primary: palette.primary, background: palette.background, text: palette.text, typography: "grotesque", density: "comfortable", imagery: "photographique", withImages: false }, status: "draft" });
        const { generatePlanCore } = await import("@/odooweb/lib/studio-workflow.server");
        const plan = await generatePlanCore({ context: context(ctx), data: { projectId: row.id } });
        return done(row.id, "/odooweb/dashboard", { plan });
      },
    },
    publier_site: {
      description: "Publier un plan de site déjà généré dans la connexion Odoo partagée. Seulement si la mission autorise explicitement la publication.",
      input: z.object({ project_id: id }),
      run: async (ctx, i) => {
        await owned(ctx, "ow_site_projects", i.project_id);
        const { publishSiteCore } = await import("@/odooweb/lib/studio-workflow.server");
        return { ...await publishSiteCore({ context: context(ctx), data: { projectId: i.project_id } }), open: "/odooweb/dashboard" };
      },
    },
  },
  businessplan: {
    creer_plan: {
      description: "Importer un vrai business plan PDF depuis Sky Cloud et lancer l'analyse native pour obtenir un document structuré valide.",
      input: z.object({ source_file_id: id, titre: text.optional() }),
      run: async (ctx, i) => {
        const source = await readSource(ctx, i.source_file_id, "pdf");
        const path = `${ctx.userId}/sky-${source.id}.pdf`;
        const { data: existing, error } = await ctx.db.from("bp_plans").select("id,status").eq("user_id", ctx.userId).eq("source_path", path).maybeSingle();
        if (error) throw new Error(error.message);
        const row = existing ?? await insertOwned(ctx, "bp_plans", { title: i.titre ?? source.name, source_filename: source.name, source_path: path, status: "uploaded" });
        if (row.status === "ready") return done(row.id, `/businessplan/plan/${row.id}`, { deja_importe: true });
        await copySource(ctx, source, "businessplan-files", path);
        const { runAnalysis } = await import("@/businessplan/lib/plans.server");
        return done(row.id, `/businessplan/plan/${row.id}`, await runAnalysis(ctx.db, ctx.userId, row.id));
      },
    },
  },
  chytect: {
    creer_projet: {
      description: "Importer une vraie photo de pièce Sky Cloud et lancer sa transformation Chytect selon les consignes. Enregistre la photo originale et le rendu final.",
      input: z.object({ source_file_id: id, titre: text, consignes: text }),
      run: async (ctx, i) => {
        const source = await readSource(ctx, i.source_file_id, "image");
        const row = await insertOwned(ctx, "chyt_projects", { name: i.titre });
        const path = `${ctx.userId}/${row.id}/original`;
        await copySource(ctx, source, "chytect-photos", path);
        const { error: updateError } = await ctx.db.from("chyt_projects").update({ photo_path: path }).eq("id", row.id).eq("user_id", ctx.userId);
        if (updateError) throw new Error(updateError.message);
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) throw new Error("Lovable AI n'est pas configuré.");
        const { editImage, imageSettings } = await import("@/chytect/lib/image-gateway.server");
        const form = new FormData();
        form.set("prompt", i.consignes);
        form.set("stream", "false");
        form.append("image[]", source.blob, source.name);
        const response = await editImage({ ...imageSettings, apiKey }, form);
        if (!response.ok) throw new Error("La transformation de la photo a échoué.");
        const result = await response.json() as { data?: { b64_json?: string }[] };
        const base64 = result.data?.[0]?.b64_json;
        if (!base64) throw new Error("Aucune image finale reçue.");
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const renderedPath = `${ctx.userId}/${row.id}/render-${crypto.randomUUID()}.png`;
        const { error } = await ctx.db.storage.from("chytect-photos").upload(renderedPath, bytes, { contentType: "image/png" });
        if (error) throw new Error(error.message);
        const render = await insertOwned(ctx, "chyt_renders", { project_id: row.id, path: renderedPath, prompt: i.consignes });
        return done(row.id, "/chytect", { render_id: render.id, path: renderedPath });
      },
    },
  },
  ecoflux: {
    creer_processus: {
      description: "Créer un dossier Ecoflux avec la description terrain réelle issue d'une autre app ou d'un fichier texte Sky Cloud. client_id requis : choisir un client Ecoflux appartenant à l'utilisateur.",
      input: z.object({ ...sourceFields, titre: text, client_id: id, departement: text.optional(), reference: text.optional() }),
      run: async (ctx, i) => {
        await owned(ctx, "eco_clients", i.client_id);
        const raw_input = await sourceText(ctx, i);
        const row = await insertOwned(ctx, "eco_processes", { title: i.titre, client_id: i.client_id, raw_input, department: i.departement ?? null, reference: i.reference ?? null, status: "draft" });
        return done(row.id, `/ecoflux/process/${row.id}`, { status: "draft" });
      },
    },
    lire_clients: {
      description: "Lire les clients Ecoflux pour choisir le client_id du processus à créer.",
      input: z.object({}),
      run: async (ctx) => {
        const { data, error } = await ctx.db.from("eco_clients").select("id,name,industry").eq("user_id", ctx.userId);
        if (error) throw new Error(error.message);
        return { clients: data, open: "/ecoflux/dashboard" };
      },
    },
  },
  tep: {
    creer_postit: {
      description: "Créer un vrai post-it TEP daté, à partir du contenu fourni par une autre application ou un fichier texte Sky Cloud.",
      input: z.object({ ...sourceFields, titre: text, jour: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), heure: z.string().regex(/^\d{2}:\d{2}$/).optional() }),
      run: async (ctx, i) => {
        const content = await sourceText(ctx, i);
        const row = await insertOwned(ctx, "tep_stickies", { day: i.jour, kind: "task", title: i.titre, content, start_time: i.heure ?? null, x: 60, y: 60 });
        return done(row.id, `/tep/planification/jour/${i.jour}`);
      },
    },
  },
};