import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Bot, CheckCircle2, ClipboardCopy, ExternalLink, FolderKanban, Send, Lightbulb, Loader2, Network, PlugZap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { applications } from "@/lib/laboratory";
import { buildContext, metricsFor } from "@/ecoflux/lib/context";
import { meta, wsKey, type Workspace } from "@/ecoflux/lib/data";
import { eur } from "@/ecoflux/lib/engine";
import { designEcosystem, refineEcosystem } from "@/ecoflux/lib/ecosystem.functions";
import { economicScenario } from "@/ecoflux/lib/economics";
import { CostProof } from "./CostProof";
import { activationShare, assignmentKey, quickWins, readiness, type Assignment, type Connections, type LabEcosystem as Eco } from "@/ecoflux/lib/ecosystem";

export const ecosystemOf = (w: Workspace) => ((w.process as unknown as { lab_ecosystem?: Eco | null }).lab_ecosystem ?? null);
export const labApp = (key: string | null) => applications.find((a) => a.key === key) ?? null;
const appName = (k: string) => k.startsWith("new:") ? `${k.slice(4)} (à créer)` : labApp(k)?.name ?? k;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw = supabase as any;

export function LabEcosystem({ w, open, onOpenChange, onFocusNode }: { w: Workspace; open: boolean; onOpenChange: (v: boolean) => void; onFocusNode: (id: string) => void }) {
  const qc = useQueryClient();
  const design = useServerFn(designEcosystem);
  const refine = useServerFn(refineEcosystem);
  const [draft, setDraft] = useState("");
  const eco = ecosystemOf(w);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [conn, setConn] = useState<Connections>({ odoo: false, google: false });
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const toBe = w.nodes.filter((n) => n.is_to_be);
  useEffect(() => {
    if (!open) return;
    void Promise.all([raw.from("odoo_connections").select("user_id").limit(1), raw.from("google_connections").select("user_id").limit(1)])
      .then(([o, g]) => setConn({ odoo: !!o.data?.length, google: !!g.data?.length }));
  }, [open]);
  useEffect(() => { setEnabled(new Set((eco?.assignments ?? []).map(assignmentKey))); }, [eco?.generated_at]);

  const m = metricsFor(w);
  const share = eco ? activationShare(eco.assignments, toBe.map((n) => ({ ref: meta(n).ref ?? "", minutes: n.cycle_time_minutes + n.wait_time_minutes })), enabled) : 1;
  const keys = useMemo(() => [...new Set((eco?.assignments ?? []).map(assignmentKey))], [eco]);
  const wins = eco ? quickWins(eco.assignments, conn) : [];
  const newApps = (eco?.assignments ?? []).filter((a) => !a.app_key && a.new_app);
  const nodeOf = (a: Assignment) => toBe.find((n) => meta(n).ref === a.node_ref);

  async function generate() {
    setPending(true);
    try {
      const r = await design({ data: {
        context: buildContext(w),
        steps: toBe.map((n) => ({ ref: meta(n).ref ?? n.id, label: n.label, explanation: meta(n).explanation ?? "", automated: n.is_automated })),
        apps: applications.filter((a) => a.key !== "ecoflux").map((a) => ({ key: a.key, name: a.name, description: a.description })),
        connections: conn,
      } });
      const { error } = await raw.from("eco_processes").update({ lab_ecosystem: r }).eq("id", w.process.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: wsKey(w.process.id) });
      toast.success("Écosystème Laboratoire généré");
    } catch (e) { toast.error(e instanceof Error ? e.message : "La génération a échoué."); }
    finally { setPending(false); }
  }
  const payload = () => ({
    context: buildContext(w),
    steps: toBe.map((n) => ({ ref: meta(n).ref ?? n.id, label: n.label, explanation: meta(n).explanation ?? "", automated: n.is_automated })),
    apps: applications.filter((a) => a.key !== "ecoflux").map((a) => ({ key: a.key, name: a.name, description: a.description })),
    connections: conn,
  });
  async function ask(message: string) {
    if (!message.trim() || pending) return;
    setPending(true);
    try {
      await refine({ data: { ...payload(), processId: w.process.id, message } });
      setDraft("");
      await qc.invalidateQueries({ queryKey: wsKey(w.process.id) });
    } catch (e) { toast.error(e instanceof Error ? e.message : "La discussion a échoué."); }
    finally { setPending(false); }
  }
  const scen = economicScenario(w, eco);
  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Action impossible."); } finally { setBusy(null); }
  }
  const uid = async () => { const { data } = await supabase.auth.getUser(); if (!data.user) throw new Error("Session expirée"); return data.user.id; };
  const deployNoject = () => run("noject", async () => {
    if (!eco) return;
    const user_id = await uid();
    const { data: p, error } = await raw.from("noject_projects").insert({ user_id, name: `Transformation — ${w.process.title}`, description: eco.summary, objective: `Gain estimé ${eur((m.hardCash + m.capacityValue) * share)}/an · dossier ${w.client.name}` }).select("id").single();
    if (error) throw error;
    const tasks = eco.phases.flatMap((ph, pi) => ph.app_keys.map((k) => ({ user_id, project_id: p.id, title: `${ph.title} · Déployer ${appName(k)}`, description: eco.assignments.filter((a) => assignmentKey(a) === k).map((a) => `${a.node_ref} — ${a.reason}`).join("\n"), position: pi * 100 + ph.app_keys.indexOf(k), tags: ["ecoflux"] })));
    if (tasks.length) { const { error: e2 } = await raw.from("noject_tasks").insert(tasks); if (e2) throw e2; }
    toast.success(`Projet créé dans Noject (${tasks.length} tâches)`, { action: { label: "Ouvrir", onClick: () => { window.location.href = "/noject/dashboard"; } } });
  });
  const createAgent = (a: Assignment) => run(`agent:${a.node_ref}`, async () => {
    const n = nodeOf(a);
    const { error } = await raw.from("st_agents").insert({ user_id: await uid(), name: `${n?.label ?? a.node_ref}`.slice(0, 60), role: "Agent Ecoflux", department: "Ecoflux", system_prompt: `${a.mission}\n\nContexte : ${w.process.title} (${w.client.name}). ${a.reason}`, lab_apps: a.app_key ? [a.app_key] : [] });
    if (error) throw error;
    toast.success("Agent créé dans Smart Teams", { action: { label: "Ouvrir", onClick: () => { window.location.href = "/smartteams"; } } });
  });
  const sendIdea = (a: Assignment) => run(`idea:${a.node_ref}`, async () => {
    const s = a.new_app!;
    const { error } = await raw.from("ideas").insert({ user_id: await uid(), title: s.name.slice(0, 150), description: `${s.mission}\n\nEntrées : ${s.inputs.join(", ")}\nSorties : ${s.outputs.join(", ")}\nGain : ${s.gain}\n\n${s.prompt}`.slice(0, 5000) });
    if (error) throw error;
    toast.success("Ajoutée dans Mes idées");
  });
  const toggle = (k: string) => setEnabled((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Network className="text-eco-cyan" /> Écosystème Laboratoire</DialogTitle></DialogHeader>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full border px-2 py-0.5 ${conn.odoo ? "border-eco-eco-emerald/50 text-eco-emerald" : "border-eco-eco-amber/50 text-eco-amber"}`}><PlugZap className="mr-1 inline size-3" />Odoo {conn.odoo ? "connecté" : "non connecté"}</span>
        <span className={`rounded-full border px-2 py-0.5 ${conn.google ? "border-eco-eco-emerald/50 text-eco-emerald" : "border-eco-eco-amber/50 text-eco-amber"}`}><PlugZap className="mr-1 inline size-3" />Google {conn.google ? "connecté" : "non connecté"}</span>
        <Button size="sm" className="eco-aig ml-auto rounded-full text-primary-foreground" disabled={pending || !toBe.length} onClick={generate}>{pending ? <Loader2 className="animate-spin" /> : <Sparkles />} {eco ? "Régénérer" : "Composer avec les apps du Lab"}</Button>
      </div>
      {!toBe.length && <p className="text-sm text-muted-foreground">Générez d’abord le schéma To-Be (étape 1 · clarification).</p>}
      {toBe.length > 0 && !eco && !pending && <p className="text-sm text-muted-foreground">L’IA va affecter une application du Laboratoire à chaque étape du schéma cible, expliquer chaque choix et proposer la création d’une app quand aucune ne convient.</p>}
      {eco && <div className="space-y-5">
        <p className="text-sm">{eco.summary}</p>

        <section className="eco-glass rounded-[18px] p-4">
          <h3 className="section-label mb-2">DIALOGUE AVEC L’ARCHITECTE</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto">{(eco.conversation ?? []).map((m) => <div key={m.id} className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-xs ${m.role === "user" ? "ml-8 bg-secondary" : "mr-8 border border-eco-eco-cyan/30"}`}>{m.parts.map((p) => p.type === "text" ? p.text : "").join("")}</div>)}
            {!(eco.conversation ?? []).length && <p className="text-xs text-muted-foreground">Demandez un ajustement : l’IA privilégie les apps internes et ne calcule aucun montant — le moteur le fait à partir de chiffres vérifiables.</p>}</div>
          <div className="mt-3 flex flex-wrap gap-2">{["100 % outils internes (zéro dépendance externe)", "Concevoir une app sur-mesure pour l’étape la plus coûteuse", "Détailler et justifier le gain financier (ROI)"].map((t) => <button key={t} type="button" disabled={pending} onClick={() => void ask(t)} className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-eco-eco-cyan/60 disabled:opacity-50">{t}</button>)}</div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(draft); }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ex. remplacer l’outil externe de l’étape T3…" className="flex-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs outline-none" />
            <Button type="submit" size="sm" disabled={pending || !draft.trim()}>{pending ? <Loader2 className="animate-spin" /> : <Send />}</Button>
          </form>
        </section>

        <section className="eco-glass rounded-[18px] p-4">
          <h3 className="section-label mb-3">SIMULATEUR D’ACTIVATION</h3>
          <div className="flex flex-wrap gap-2">{keys.map((k) => <label key={k} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${enabled.has(k) ? "border-eco-eco-cyan/60 text-foreground" : "border-border text-muted-foreground"}`}><input type="checkbox" checked={enabled.has(k)} onChange={() => toggle(k)} />{appName(k)}</label>)}</div>
          <p className="mt-3 text-sm">Gain annuel estimé avec cette sélection : <b className="text-eco-cyan">{eur((m.hardCash + m.capacityValue) * share)}</b> <span className="text-muted-foreground">({Math.round(share * 100)} % du gain cible de {eur(m.hardCash + m.capacityValue)})</span></p>
        </section>

        <section>
          <h3 className="section-label mb-2">CARTOGRAPHIE DES FLUX</h3>
          {eco.flows.length ? <div className="grid gap-2 sm:grid-cols-2">{eco.flows.map((f, i) => <div key={i} className="eco-glass flex items-center gap-2 rounded-xl px-3 py-2 text-xs"><b>{appName(f.from)}</b><ArrowRight className="size-3.5 shrink-0 text-eco-violet" /><b>{appName(f.to)}</b><span className="ml-auto text-right text-muted-foreground">{f.data}</span></div>)}</div> : <p className="text-xs text-muted-foreground">Aucun flux inter-apps identifié.</p>}
        </section>

        {wins.length > 0 && <section>
          <h3 className="section-label mb-2">QUICK WINS · DÉMARRABLES AUJOURD’HUI</h3>
          <div className="flex flex-wrap gap-2">{wins.map((a) => <span key={a.node_ref} className="rounded-full border border-eco-eco-emerald/50 px-2.5 py-1 text-xs text-eco-emerald"><CheckCircle2 className="mr-1 inline size-3" />{appName(a.app_key!)} · {nodeOf(a)?.label ?? a.node_ref}</span>)}</div>
        </section>}

        <section>
          <h3 className="section-label mb-2">CHOIX DE CHAQUE APP PAR ÉTAPE</h3>
          <div className="space-y-2">{eco.assignments.map((a) => {
            const n = nodeOf(a); const app = labApp(a.app_key); const r = readiness(a, conn);
            return <article key={a.node_ref} className="eco-glass rounded-xl p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="font-mono text-eco-violet hover:underline" onClick={() => { if (n) onFocusNode(n.id); }}>{a.node_ref}</button>
                <span className="font-medium">{n?.label}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span className={`rounded-full border px-2 py-0.5 ${app ? "border-eco-eco-cyan/50 text-eco-cyan" : "border-eco-eco-amber/60 text-eco-amber"}`}>{app ? app.name : `+ ${a.new_app?.name ?? "App à créer"}`}</span>
                <span className={r.ready ? "text-eco-emerald" : "text-eco-amber"}>{r.label}</span>
                <span className="ml-auto text-muted-foreground">effort {a.effort} · impact {a.impact}</span>
              </div>
              <p className="mt-2">{a.reason}</p>
              {a.gain && <p className="mt-1 text-eco-emerald">{a.gain}</p>}
              {n && <div className="mt-2"><CostProof node={n} eco={eco} reworkRatePercent={scen.p.rework_rate_percent} latencyCostPerHour={scen.p.latency_cost_per_hour} /></div>}
              <div className="mt-2 flex flex-wrap gap-2">
                {app && <Button asChild size="sm" variant="secondary" className="h-7 rounded-full text-xs"><a href={app.to}><ExternalLink /> Ouvrir {app.name}</a></Button>}
                {!r.ready && r.missing.length > 0 && <Button asChild size="sm" variant="outline" className="h-7 rounded-full text-xs"><a href={`/settings?tab=${r.missing.includes("Odoo") ? "odoo" : "google"}`}><PlugZap /> Connecter</a></Button>}
                {a.mission && <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" disabled={busy === `agent:${a.node_ref}`} onClick={() => createAgent(a)}><Bot /> Engager un agent Smart Teams</Button>}
              </div>
            </article>;
          })}</div>
        </section>

        {newApps.length > 0 && <section>
          <h3 className="section-label mb-2">APPS À CRÉER POUR CE PROCESSUS</h3>
          <div className="space-y-2">{newApps.map((a) => { const s = a.new_app!; return <article key={a.node_ref} className="rounded-xl border border-eco-eco-amber/40 p-3 text-xs">
            <h4 className="text-sm font-semibold text-eco-amber">{s.name}</h4>
            <p className="mt-1">{s.mission}</p>
            <dl className="mt-2 grid gap-1 sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Entrées</dt><dd>{s.inputs.join(", ") || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Sorties</dt><dd>{s.outputs.join(", ") || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Tables ({s.prefix})</dt><dd>{s.tables.join(" · ") || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Pages</dt><dd>{s.routes.join(" · ") || "—"}</dd></div>
              <div><dt className="text-muted-foreground">IA</dt><dd>{s.ai || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Gain visé</dt><dd>{s.gain || "—"}</dd></div>
            </dl>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" className="h-7 rounded-full text-xs" onClick={() => { void navigator.clipboard.writeText(s.prompt).then(() => toast.success("Cahier des charges copié")); }}><ClipboardCopy /> Copier le prompt de génération</Button>
              <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" disabled={busy === `idea:${a.node_ref}`} onClick={() => sendIdea(a)}><Lightbulb /> Envoyer dans Mes idées</Button>
            </div>
          </article>; })}</div>
        </section>}

        <section>
          <h3 className="section-label mb-2">PLAN D’ADOPTION</h3>
          <ol className="space-y-1 text-xs">{eco.phases.map((p, i) => <li key={i}><b>Phase {i + 1} — {p.title}</b> : {p.app_keys.map(appName).join(", ")}</li>)}</ol>
          <Button className="mt-3 rounded-full" size="sm" disabled={busy === "noject"} onClick={deployNoject}>{busy === "noject" ? <Loader2 className="animate-spin" /> : <FolderKanban />} Déployer le projet dans Noject</Button>
        </section>
      </div>}
    </DialogContent>
  </Dialog>;
}

