<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep state-driven full-screen assistant visuals in `AuraMotion`, independent of recording and Odoo logic, so visual changes cannot alter voice actions.
- Aura drives the IDEALAB lab by returning a lab page path that the app navigates to directly (no iframes; double-click/double-tap on Aura opens /dashboard); app actions run server-side through the registry in src/lib/assistant-apps.server.ts, so new apps only add registry actions.
- Lab apps share Aura's single Odoo connection row (column `db`, aliased to `db_name` in lab code) so users enter Odoo credentials once.
- Lab styles are scoped under `.lab-theme`, applied by the `_authenticated` layout only to Laboratory pages (whitelist), so it never restyles Aura or other apps.
- Each app's CSS lives in its own file inside its folder (scoped under its theme class) and is imported at the top of src/styles.css, so apps never share styles.
- Lab pages link back to the Aura home screen for voice, so all voice actions use one registry.
- Task panel geometry is managed by native pointer events and a validated localStorage preference, avoiding additional UI dependencies.
- Assistant text/actions return before a separate authenticated speech request, so voice synthesis never delays task feedback.
- MyMackenzy pages live under `/mm/*` (`_authenticated/mm` layout) with `.mm-theme`-scoped styles, so they coexist with the lab's /dashboard and /settings without restyling other apps.
- Smart Teams uses `/smartteams`, isolated `st_` tables and `.st-theme` styles, preserving existing apps and their records; its Odoo actions reuse the shared connection.
- Smart Teams AI helpers stream through SDK providers, preserve imported model choices and output budgets, and stop sequential task execution after an error to avoid repeated blocked requests.
- The imported TEP app lives in src/tep, routes under `/tep/*` (`src/routes/tep` layout), `tep_` tables and `.tep-theme` styles (also set on <body> for dialogs), so it never collides with other apps; its Google OAuth callback is /api/public/tep-google/callback.
- Smart Teams agents act in lab apps through the same server action registry as Aura (per-agent `lab_apps` allow-list), so adding a registry action makes it available to both.
- MyMackenzy automations use lab apps by listing registry app keys in an agent's `services`; cron runs call the shared action registry through a user-scoped admin client (`scopedClient`), and Google is only required when a Google service is listed.
- Per-app AI model choice lives in `user_app_models` and is read server-side via `resolveAppAiModel` (src/lib/ai-models.server.ts) with a fallback, so apps never break when no choice is saved.
- Imported Nova CRM lives in src/crm with routes under /_authenticated/crm (URL /crm/*), .crm-theme styles and /api/public/crm-google|crm-mailgun callbacks, so it never collides with lab /dashboard or /settings; it keeps its original table names.
- Imported Noject lives in src/noject with routes under /_authenticated/noject (URL /noject/*), `noject_` tables typed by src/noject/types.ts via `nj()`, and `.noject-theme` styles, so it never collides with other apps.
- Imported PlanAgenda lives in src/planagenda with route /planning (`_authenticated/planning.tsx`), `pa_` tables (typed locally in src/planagenda/types), `.pa-theme` scoped styles with `pa-` prefixed classes, and /api/public/pa-google/callback, so it never collides with other apps or the shared google_connections table.
- Every app owns tables with its own unique prefix (skydoc_, skytab_, skycloud_, skytask_, calendsky_, sendy_, crm_, angelo_, ocktavus_, mm_, st_, tep_, noject_, pa_); only the Laboratory keeps unprefixed shared tables (profiles, settings, AI models, Odoo/Google connections, lab_activity, ideas), so no app can collide with another's schema.
- Every app owns a unique URL prefix (/angelo, /mm, /tep, /sendy, /smartteams, /skytask, /crm, /noject…); only the Laboratory/Aura core stays at the root, so app URLs never collide.
- Each app keeps its non-route code in `src/{app}/` (components/, lib/) and uses its own prefixed storage bucket (e.g. skycloud-files, sendy-attachments); routes stay in src/routes because TanStack requires it, so apps never share code folders or files.
- Each prefixed app has `src/{app}/types.ts` (its own tables only) and a `src/{app}/lib/db.ts` cast helper (st, sd, stab, sy, sc, ang, like `nj()`), so queries are typed to the app's own schema.
- App attachments live in the app's own bucket under `{userId}/{scope}/` (storage-list only, no table), matching the per-user folder RLS on those buckets.
- Imported SkyVente lives in src/skyvente with routes under /_authenticated/skyvente (URL /skyvente/*), a public signature page at /skyvente-sign/$token, `sv_` tables/RPCs, the `skyvente-logos` bucket and `.skyvente-theme` styles with `sv-` prefixed utilities, so it never collides with other apps.
- Imported SkyAchat lives in src/skyachat with routes under /_authenticated/skyachat (URL /skyachat/*), `sa_` tables, the `skyachat-attachments` bucket and `.skyachat-theme` styles with `sa-` prefixed utilities, so it never collides with other apps.
- Imported SkyComptable lives in src/skycomptable with routes under /_authenticated/skycomptable (URL /skycomptable/*), `skc_` tables/RPCs typed by src/skycomptable/types.ts via `skc()`, and `.skycomptable-theme` styles with `skc-` prefixed utilities, so it never collides with other apps.
- Sky Vente/Sky Achat invoices post to Sky Comptable via src/skycomptable/lib/bridge.ts (soft link: entry source_type/source_id + document accounting_entry_id), never via DB triggers, so incomplete accounting setup never blocks invoicing.
- Imported Dyap lives in src/dyap with routes under /_authenticated/dyap (URL /dyap/*), `dyap_` tables typed by src/dyap/types.ts via `dy()`, the `dyap-files` bucket and `.dyap-theme` styles; its AI runs in createServerFn via resolveAppAiModel("dyap"), so it never collides with other apps.
- Imported Holo CM (LinkedIn community manager) lives in src/cml with routes under /_authenticated/cml (URL /cml/*), `cml_` tables, `.cml-theme` styles with `cml-` prefixed utilities and /api/public/cml-hooks/* cron endpoints, so it never collides with other apps.
- Imported NexusJob lives in src/nexusjob with routes under /_authenticated/nexusjob (URL /nexusjob/*), `nxj_` tables, its own ui variants in src/nexusjob/components/ui and `.nexusjob-theme` styles with `nxj-` utilities, so it never collides with other apps.
- Imported Feeloo (HR cockpit) lives in src/feeloo with routes under /_authenticated/feeloo (URL /feeloo/*), `fl_` tables, `.feeloo-theme` styles and /api/public/feeloo-google|feeloo-hooks endpoints; its AI model resolves via resolveAppAiModel("feeloo"), so it never collides with other apps.
- Imported Business Plan Pro Studio lives in src/businessplan with routes under /_authenticated/businessplan (URL /businessplan/*), the `bp_plans` table via `bp()`, the `businessplan-files` bucket and `.bp-theme` styles with `bp-` utilities; its AI model resolves via resolveAppAiModel("businessplan"), so it never collides with other apps.
- Validate stored Business Plan content with the shared browser-safe `isPlanContent` guard before preview, editing or printing; incomplete JSON must use existing empty states instead of crashing the document renderer.
- Imported Étude de marché lives in src/etudedemarche with routes under /_authenticated/etudedemarche (URL /etudedemarche/*), `edm_` tables (accessed untyped via casts) and `.edm-theme` styles, so it never collides with other apps.
- Imported FinancierPlan lives in src/financierplan with routes under /_authenticated/financierplan (URL /financierplan/*), `fp_` tables typed by src/financierplan/types.ts via `fp()`, and `.fp-theme` styles; its AI model resolves via resolveAppAiModel("financierplan"), so it never collides with other apps.
- Imported Prospect Engine (agent OLLY) lives in src/prospect with routes under /_authenticated/prospect (URL /prospect/*), `pe_` tables typed by src/prospect/types.ts via `pe()`, `.prospect-theme` styles with `pe-` utilities and /api/public/pe-hooks/olly-tick; Gmail/Calendar tokens come from the shared `google_connections` row, so users connect Google once in Laboratory settings.
- Imported Pascal (senior sales agent) lives in src/pascal with routes under /_authenticated/pascal (URL /pascal/*), `psc_` tables (embeds aliased to original names), `.pascal-theme` styles, Google via the shared Laboratory `google_connections` row, and cron endpoint /api/public/pascal-hooks/tick, so it never collides with other apps.

- Queue Flow (salle d’attente) lives in src/queueflow with dashboard under /_authenticated/queueflow (URL /queueflow/*), public pages /queueflow-q/$slug and /queueflow-ticket/$entryId (outside the auth layout), `qf_` tables via `qf()` and `.queueflow-theme` styles, so it never collides with other apps.
- Imported AtelierImmo lives in src/immo with routes under /_authenticated/immo (URL /immo/*), a public property page /immo-bien/$id, the `immo_properties` table via `immoDb`, the `immo-photos` bucket and `.immo-theme` styles with `immo-` utilities, so it never collides with other apps.
- Imported Chytect (Interior AI Studio) lives in src/chytect with route /_authenticated/chytect (URL /chytect), `chyt_` tables via `chyt`, the `chytect-photos` bucket, `.chytect-theme` styles with `chyt-` utilities and the streaming image route /api/chytect-edit-image (self-verifies the bearer), so it never collides with other apps.
- Imported Coussel (carrousels manuscrits) lives in src/coussel with routes under /_authenticated/coussel (URL /coussel/*), `csl_` tables via `csl()`, the `coussel-slides` bucket and `.coussel-theme` styles with `csl-` utilities; its reasoning model resolves via resolveAppAiModel("coussel"), so it never collides with other apps.
- Studio Produit: src/studioproduit, URL /studioproduit/*, `sp_` tables via `sp()`, `studioproduit-photos` bucket, `.studioproduit-theme`/`sp-` styles, /api/public/sp-google|sp-hooks; AI via resolveAppAiModel("studioproduit"), so it never collides with other apps.
- Odoo Site Studio: src/odooweb, URL /odooweb/*, `ow_` tables via `ow()`, `.odooweb-theme`; reuses shared `odoo_connections`, so it never collides.
