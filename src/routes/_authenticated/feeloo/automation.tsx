import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { BentoCard, StatBento } from "@/feeloo/components/bento-card";
import { Button } from "@/feeloo/components/ui/button";
import { Input } from "@/feeloo/components/ui/input";
import { Label } from "@/feeloo/components/ui/label";
import { Switch } from "@/feeloo/components/ui/switch";
import { Mail, Sheet, RefreshCw, Trash2, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getAutomationStateFn, saveAutomationFn, runSyncNowFn, clearSyncMemoryFn } from "@/feeloo/lib/automation.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feeloo/automation")({
  head: () => ({
    meta: [
      { title: "Automatisation & Cron — TalentCortex" },
      { name: "description", content: "Pilote les synchronisations automatiques Gmail et Google Sheets, avec journal temps réel." },
      { property: "og:title", content: "Automatisation & Cron — TalentCortex" },
      { property: "og:description", content: "Crons réels, mémoire anti-doublon et journal d'exécution en direct." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AutomationPage,
});

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("fr-FR") : "—");

function AutomationPage() {
  const getState = useServerFn(getAutomationStateFn);
  const save = useServerFn(saveAutomationFn);
  const runNow = useServerFn(runSyncNowFn);
  const clearMem = useServerFn(clearSyncMemoryFn);

  const [state, setState] = useState<any>(null);
  const [s, setS] = useState<any>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const st: any = await getState();
    setState(st);
    setS(st.settings ?? {});
  }, [getState]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel("cron-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "fl_cron_runs" }, load)
      .subscribe();
    const t = setInterval(load, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [load]);

  const patch = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }));

  const persist = async (extra: Record<string, any> = {}) => {
    const payload = {
      gmail_cron_enabled: !!s.gmail_cron_enabled,
      gmail_interval_minutes: Number(s.gmail_interval_minutes) || 15,
      gmail_max_per_run: Number(s.gmail_max_per_run) || 10,
      gmail_keywords: s.gmail_keywords ?? "cv",
      gmail_require_attachment: !!s.gmail_require_attachment,
      gmail_search_query: s.gmail_search_query ?? "",
      sheets_cron_enabled: !!s.sheets_cron_enabled,
      sheets_interval_minutes: Number(s.sheets_interval_minutes) || 15,
      sheets_max_per_run: Number(s.sheets_max_per_run) || 10,
      sheets_spreadsheet_id: s.sheets_spreadsheet_id || null,
      sheets_range: s.sheets_range || "A:Z",
      auto_sync: s.auto_sync !== false,
      auto_match: s.auto_match !== false,
      email_provider: emailProv,
      spreadsheet_provider: sheetProv,
      skytab_sheet_id: s.skytab_sheet_id || null,
      ...extra,
    };
    await save({ data: payload });
    toast.success("Automatisation enregistrée");
    load();
  };

  const trigger = async (kind: "gmail" | "sheets") => {
    setBusy(kind);
    try {
      const r: any = await runNow({ data: { kind } });
      if (r?.skipped) toast.info(`Ignoré : ${r.skipped}`);
      else toast.success(`Sync ${kind} : ${r?.processed ?? 0} créé(s), ${r?.skipped ?? 0} déjà connu(s).`);
    } catch (e: any) { toast.error(e?.message ?? "Erreur de synchronisation"); }
    finally { setBusy(null); load(); }
  };

  const runs: any[] = state?.runs ?? [];
  const connected = !!state?.google;
  const emailProv: "sendy" | "gmail" = s.email_provider ?? "sendy";
  const sheetProv: "skytab" | "google_sheets" = s.spreadsheet_provider ?? "skytab";
  const sheets: { id: string; name: string }[] = state?.skytabSheets ?? [];
  const Tabs = ({ value, opts, onPick }: { value: string; opts: [string, string][]; onPick: (v: string) => void }) => (
    <div className="mb-3 inline-flex rounded-xl border border-border bg-white/40 p-1 gap-1">
      {opts.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onPick(v)}
          className={`rounded-lg px-3 py-1 text-xs font-medium ${value === v ? "bg-white shadow-sm" : "text-muted-foreground"}`}>{l}</button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between pl-12 md:pl-0">
        <div className="min-w-0">
          <h1 className="truncate text-2xl sm:text-3xl font-display font-semibold">Automatisation <span className="holo-text">temps réel</span></h1>
          <p className="text-xs text-muted-foreground mt-1">
            {connected ? `Google connecté : ${state.google.email ?? "compte lié"}` : "Aucun compte Google connecté — va dans Intégrations."}
          </p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="size-4 mr-1" />Rafraîchir</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBento label="Exécutions" value={runs.length} sub="30 dernières" icon={<Activity className="size-5" />} />
        <StatBento label="Mails mémorisés" value={state?.memory?.emails ?? 0} sub="anti-doublon Gmail" icon={<Mail className="size-5" />} />
        <StatBento label="Lignes mémorisées" value={state?.memory?.rows ?? 0} sub="anti-doublon Sheets" icon={<Sheet className="size-5" />} />
        <StatBento label="Créations" value={runs.reduce((a, r) => a + (r.items_processed ?? 0), 0)} sub="candidats + postes" icon={<CheckCircle2 className="size-5" />} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* GMAIL */}
        <BentoCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-9 rounded-xl holo-bg grid place-items-center text-white"><Mail className="size-4" /></div>
            <div className="min-w-0"><div className="font-medium">Cron Gmail — détection de CV</div>
              <div className="text-xs text-muted-foreground">Dernière exécution : {fmt(s.gmail_last_run_at)}</div></div>
            <Switch className="ml-auto" checked={s.gmail_cron_enabled !== false} onCheckedChange={(v) => patch("gmail_cron_enabled", v)} />
          </div>
          <Tabs value={emailProv} opts={[["sendy", "Sendy (Interne)"], ["gmail", "Gmail (Google OAuth)"]]} onPick={(v) => patch("email_provider", v)} />
          {emailProv === "sendy"
            ? <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-700"><CheckCircle2 className="size-3" />Connecté à la boîte Sendy</div>
            : <p className="mb-3 text-xs text-muted-foreground">{connected ? `Compte Google : ${state.google.email ?? "lié"}` : "Connecte ton compte Google dans Intégrations (OAuth) pour lire les CV reçus sur Gmail."}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Fréquence (minutes)</Label>
              <Input type="number" min={1} className="bg-white/60" value={s.gmail_interval_minutes ?? 15} onChange={(e) => patch("gmail_interval_minutes", e.target.value)} /></div>
            <div><Label className="text-xs">Max de mails / exécution</Label>
              <Input type="number" min={1} max={50} className="bg-white/60" value={s.gmail_max_per_run ?? 10} onChange={(e) => patch("gmail_max_per_run", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Mots-clés détectés (séparés par des virgules)</Label>
              <Input className="bg-white/60" value={s.gmail_keywords ?? "cv"} onChange={(e) => patch("gmail_keywords", e.target.value)} /></div>
            {emailProv === "gmail" && <div className="sm:col-span-2"><Label className="text-xs">Requête Gmail avancée (optionnel, prioritaire)</Label>
              <Input className="bg-white/60" placeholder='ex: ("cv" OR "candidature") has:attachment newer_than:14d'
                value={s.gmail_search_query ?? ""} onChange={(e) => patch("gmail_search_query", e.target.value)} /></div>}
            <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-white/40 px-3 py-2">
              <Label className="text-xs">Exiger une pièce jointe</Label>
              <Switch checked={!!s.gmail_require_attachment} onCheckedChange={(v) => patch("gmail_require_attachment", v)} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => persist()}>Enregistrer</Button>
            <Button variant="outline" disabled={busy === "gmail" || (emailProv === "gmail" && !connected)} onClick={() => trigger("gmail")}>
              <RefreshCw className={`size-4 mr-1 ${busy === "gmail" ? "animate-spin" : ""}`} />Lancer maintenant
            </Button>
            <Button variant="ghost" onClick={async () => { await clearMem({ data: { kind: "gmail" } }); toast.success("Mémoire Gmail réinitialisée"); load(); }}>
              <Trash2 className="size-4 mr-1" />Vider la mémoire
            </Button>
          </div>
        </BentoCard>

        {/* SHEETS */}
        <BentoCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-9 rounded-xl holo-bg grid place-items-center text-white"><Sheet className="size-4" /></div>
            <div className="min-w-0"><div className="font-medium">Cron postes / offres</div>
              <div className="text-xs text-muted-foreground">Dernière exécution : {fmt(s.sheets_last_run_at)}</div></div>
            <Switch className="ml-auto" checked={s.sheets_cron_enabled !== false} onCheckedChange={(v) => patch("sheets_cron_enabled", v)} />
          </div>
          <Tabs value={sheetProv} opts={[["skytab", "Sky Tab (Interne)"], ["google_sheets", "Google Sheets (Google OAuth)"]]} onPick={(v) => patch("spreadsheet_provider", v)} />
          <div className="grid sm:grid-cols-2 gap-3">
            {sheetProv === "skytab" ? <div className="sm:col-span-2"><Label className="text-xs">Classeur Sky Tab</Label>
              {sheets.length === 0
                ? <p className="text-xs text-muted-foreground mt-1">Aucun classeur pour l'instant. <Link to="/skytab" className="underline">Créer un classeur dans Sky Tab</Link></p>
                : <select className="mt-1 w-full rounded-md border border-border bg-white/60 px-3 py-2 text-sm" value={s.skytab_sheet_id ?? ""} onChange={(e) => patch("skytab_sheet_id", e.target.value || null)}>
                    <option value="">— Choisir un classeur —</option>
                    {sheets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>}
            </div> : <>
            <div className="sm:col-span-2"><Label className="text-xs">ID du Google Sheet</Label>
              <Input className="bg-white/60" value={s.sheets_spreadsheet_id ?? ""} onChange={(e) => patch("sheets_spreadsheet_id", e.target.value)} placeholder="1BxiMVs0XRA5nFMdKvBd…" /></div>
            <div><Label className="text-xs">Plage</Label>
              <Input className="bg-white/60" value={s.sheets_range ?? "A:Z"} onChange={(e) => patch("sheets_range", e.target.value)} /></div></>}
            <div><Label className="text-xs">Fréquence (minutes)</Label>
              <Input type="number" min={1} className="bg-white/60" value={s.sheets_interval_minutes ?? 15} onChange={(e) => patch("sheets_interval_minutes", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Max de lignes / exécution</Label>
              <Input type="number" min={1} max={50} className="bg-white/60" value={s.sheets_max_per_run ?? 10} onChange={(e) => patch("sheets_max_per_run", e.target.value)} /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => persist()}>Enregistrer</Button>
            <Button variant="outline" disabled={busy === "sheets" || (sheetProv === "google_sheets" && !connected)} onClick={() => trigger("sheets")}>
              <RefreshCw className={`size-4 mr-1 ${busy === "sheets" ? "animate-spin" : ""}`} />Lancer maintenant
            </Button>
            <Button variant="ghost" onClick={async () => { await clearMem({ data: { kind: "sheets" } }); toast.success("Mémoire Sheets réinitialisée"); load(); }}>
              <Trash2 className="size-4 mr-1" />Vider la mémoire
            </Button>
          </div>
        </BentoCard>
      </div>

      <BentoCard>
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium flex items-center gap-2"><Activity className="size-4" />Journal des crons (temps réel)</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500 pulse-dot" />en direct
          </div>
        </div>
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {runs.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Aucune exécution pour l'instant.</div>}
          {runs.map((r) => (
            <details key={r.id} className="rounded-2xl bg-white/50 border border-border p-3">
              <summary className="cursor-pointer list-none grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className={`size-8 rounded-lg grid place-items-center text-white ${r.status === "error" ? "bg-rose-500" : r.status === "running" ? "bg-amber-500" : "bg-emerald-500"}`}>
                  {r.status === "error" ? <XCircle className="size-4" /> : r.status === "running" ? <Clock className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">
                    {r.kind === "gmail" ? "Gmail" : "Google Sheets"} · {r.trigger} · {r.items_processed} créé(s) / {r.items_skipped} ignoré(s)
                  </span>
                  <span className="block text-[11px] text-muted-foreground">{fmt(r.started_at)}{r.duration_ms ? ` · ${(r.duration_ms / 1000).toFixed(1)}s` : ""}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-white/60 shrink-0">{r.status}</span>
              </summary>
              <div className="mt-3 space-y-1 text-xs font-mono">
                {r.error && <div className="text-rose-600">⚠ {r.error}</div>}
                {(r.logs ?? []).map((l: any, i: number) => (
                  <div key={i} className={l.level === "error" ? "text-rose-600" : l.level === "warn" ? "text-amber-600" : l.level === "success" ? "text-emerald-700" : "text-muted-foreground"}>
                    {new Date(l.t).toLocaleTimeString("fr-FR")} · {l.msg}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </BentoCard>
    </div>
  );
}
