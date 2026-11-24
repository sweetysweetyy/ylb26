import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Sparkles } from "lucide-react";
import { metricsFor, toEngine } from "@/ecoflux/lib/context";
import { eur, formatDuration, num } from "@/ecoflux/lib/engine";
import { meta, updateNode, wsKey, type Workspace } from "@/ecoflux/lib/data";
import { CONFIDENCE_LABEL, confidence, diagnostics, engineInput, opportunities, scenarios, simulate, suggestions, type ScenarioKey } from "@/ecoflux/lib/insights";
import type { PNode } from "@/ecoflux/lib/types";

export function SuggestionChips({ w, node, onPick, disabled }: { w: Workspace; node: PNode | null; onPick: (t: string) => void; disabled?: boolean }) {
  return <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">{suggestions(w, node).map((s) => <button key={s} disabled={disabled} onClick={() => onPick(s)} className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-card/90 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur transition hover:border-eco-eco-cyan/50 hover:text-foreground disabled:opacity-40"><Sparkles className="size-3 text-eco-cyan" />{s}</button>)}</div>;
}

const TABS = ["Diagnostic", "Scénarios", "Gains", "Priorités"] as const;

export function InsightsPanel({ w, onFocusNode, onApplied }: { w: Workspace; onFocusNode: (id: string) => void; onApplied?: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Diagnostic");
  return <div className="flex flex-col gap-4">
    <div className="flex gap-1 rounded-full border border-border bg-secondary p-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full px-3 py-1 text-xs ${tab === t ? "bg-accent text-foreground" : "text-muted-foreground"}`}>{t}</button>)}</div>
    {tab === "Diagnostic" && <Diagnostics w={w} onFocusNode={onFocusNode} />}
    {tab === "Scénarios" && <Scenarios w={w} onApplied={onApplied} />}
    {tab === "Gains" && <Waterfall w={w} />}
    {tab === "Priorités" && <Matrix w={w} onFocusNode={onFocusNode} />}
  </div>;
}

function Diagnostics({ w, onFocusNode }: { w: Workspace; onFocusNode: (id: string) => void }) {
  const input = engineInput(w);
  const asIs = diagnostics(w.nodes.filter((n) => !n.is_to_be).map(toEngine), input);
  const toBe = diagnostics(w.nodes.filter((n) => n.is_to_be).map(toEngine), input);
  const block = (title: string, list: typeof asIs) => <div><h3 className="mb-2 text-xs font-medium text-muted-foreground">{title}</h3>{list.length ? <ul className="space-y-2">{list.map((d, i) => <li key={i}><button disabled={!d.nodeId} onClick={() => d.nodeId && onFocusNode(d.nodeId)} className="flex w-full gap-3 rounded-xl border border-border p-3 text-left text-xs hover:bg-accent disabled:hover:bg-transparent"><AlertTriangle className={`size-4 shrink-0 ${d.level === "high" ? "text-eco-magenta" : "text-eco-amber"}`} /><span><span className="block font-medium">{d.title}</span><span className="text-muted-foreground">{d.detail}</span></span></button></li>)}</ul> : <p className="text-xs text-eco-emerald">Aucune anomalie détectée.</p>}</div>;
  return <div className="space-y-4">{block("Processus actuel (As-Is)", asIs)}{block("Processus cible (To-Be)", toBe)}<p className="text-[11px] text-muted-foreground">Cliquez une alerte pour ouvrir l'étape concernée.</p></div>;
}

function Scenarios({ w, onApplied }: { w: Workspace; onApplied?: (() => void) | undefined }) {
  const list = scenarios(w);
  const current = metricsFor(w);
  if (!w.nodes.some((n) => !n.is_to_be)) return <p className="text-xs text-muted-foreground">Construisez d'abord le schéma actuel pour simuler des scénarios.</p>;
  const qc = useQueryClient();
  const [busy, setBusy] = useState<ScenarioKey | null>(null);
  const norm = (s: string) => s.trim().toLowerCase();
  async function apply(key: ScenarioKey, title: string) {
    setBusy(key);
    try {
      const sim = simulate(w.nodes.filter((n) => !n.is_to_be).map(toEngine), key, engineInput(w));
      const byPos = (a: PNode, b: PNode) => a.position_x - b.position_x || a.position_y - b.position_y;
      const asIsSorted = w.nodes.filter((n) => !n.is_to_be).sort(byPos);
      const toBeSorted = w.nodes.filter((n) => n.is_to_be).sort(byPos);
      const used = new Set<string>();
      let count = 0;
      for (const s of sim) {
        let target = toBeSorted.find((n) => !used.has(n.id) && norm(n.label) === norm(s.label));
        if (!target) { const i = asIsSorted.findIndex((n) => n.id === s.id); const c = toBeSorted[i]; if (c && !used.has(c.id) && c.action_type !== "event") target = c; }
        if (!target) continue;
        used.add(target.id);
        const patch: Partial<PNode> = { cycle_time_minutes: s.cycle_time_minutes, wait_time_minutes: s.wait_time_minutes, is_automated: s.is_automated };
        if (s.is_automated) Object.assign(patch, { color_code: "automated", action_type: "automated_agent", assigned_role: "Agent IA" });
        else if (target.action_type === "automated_agent") Object.assign(patch, { color_code: "value_add", action_type: "operation" });
        await updateNode(target.id, patch as Parameters<typeof updateNode>[1]);
        count++;
      }
      await qc.invalidateQueries({ queryKey: wsKey(w.process.id) });
      if (count) toast.success(`Scénario « ${title} » appliqué à ${count} étape(s) du To-Be.`); if (count) onApplied?.();
      else toast.error("Aucune étape To-Be ne correspond aux étapes actuelles.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "L'application a échoué."); }
    finally { setBusy(null); }
  }
  const rows = [...list.map((s) => ({ key: s.key as ScenarioKey | null, title: s.title, desc: s.desc, r: s.result })), { key: null, title: "Votre To-Be", desc: "Le schéma cible actuellement modélisé.", r: current }];
  return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{rows.map((s) => <div key={s.title} className="eco-glass rounded-[16px] p-3 text-xs"><p className="font-medium">{s.title}</p><p className="mb-2 text-[11px] text-muted-foreground">{s.desc}</p><dl className="space-y-1"><Row k="Gain net annuel" v={`+${eur(s.r.netGain)}`} c="text-eco-cyan" /><Row k="Investissement" v={eur(s.r.implementationCost)} /><Row k="Retour sur investissement" v={s.r.paybackDays === null ? "—" : s.r.paybackDays === 0 ? "immédiat" : `${s.r.paybackDays} j`} /><Row k="Délai de cycle" v={`−${Math.round(s.r.cycleReduction)} %`} /></dl>{s.key && <button disabled={busy !== null} onClick={() => void apply(s.key!, s.title)} className="mt-2 w-full rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-eco-eco-cyan/50 hover:text-foreground disabled:opacity-40">{busy === s.key ? "Application…" : "Appliquer au To-Be"}</button>}</div>)}</div><p className="text-[11px] text-muted-foreground">Hypothèses : une étape automatisée garde 10 % de son temps de travail et coûte {eur(6000)} à mettre en place.</p></div>;
}

function Row({ k, v, c }: { k: string; v: string; c?: string }) { return <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className={c}>{v}</dd></div>; }

function Waterfall({ w }: { w: Workspace }) {
  const m = metricsFor(w);
  const vol = Number(w.process.annual_volume);
  const items = [
    { k: "Reprises évitées (non-qualité)", v: Math.max(0, (m.asIs.risk - m.toBe.risk) * vol), c: "bg-eco-emerald", hint: "Trésorerie directe" },
    { k: "Latence supprimée", v: Math.max(0, (m.asIs.latency - m.toBe.latency) * vol), c: "bg-eco-emerald", hint: "Trésorerie directe" },
    { k: "Capacité humaine libérée", v: m.capacityValue, c: "bg-eco-cyan", hint: `${num(m.hoursFreed)} h/an redéployables` },
    { k: "Investissement de mise en place", v: -m.implementationCost, c: "bg-eco-magenta", hint: "Coût unique, année 1" },
  ];
  const max = Math.max(1, ...items.map((i) => Math.abs(i.v)));
  const net = items.reduce((s, i) => s + i.v, 0);
  return <div className="space-y-3 text-xs">{items.map((i) => <div key={i.k}><div className="mb-1 flex justify-between"><span>{i.k} <span className="text-muted-foreground">· {i.hint}</span></span><span>{i.v < 0 ? "−" : "+"}{eur(Math.abs(i.v))}</span></div><div className="h-2 rounded-full bg-secondary"><div className={`h-2 rounded-full ${i.c}`} style={{ width: `${(Math.abs(i.v) / max) * 100}%` }} /></div></div>)}<div className="flex justify-between border-t border-border pt-2 font-medium"><span>Bilan net année 1</span><span className={net >= 0 ? "text-eco-cyan" : "text-eco-magenta"}>{net < 0 ? "−" : "+"}{eur(Math.abs(net))}</span></div><p className="text-[11px] text-muted-foreground">Vert = économie de trésorerie réelle. Bleu = heures libérées valorisées : un potentiel, pas une économie garantie.</p></div>;
}

const QUAD = { quick: { t: "Quick-wins", d: "Fort impact, effort faible", c: "border-eco-eco-emerald/50" }, strategic: { t: "Chantiers stratégiques", d: "Fort impact, effort élevé", c: "border-eco-eco-cyan/50" }, minor: { t: "Gains marginaux", d: "Impact faible, effort faible", c: "border-border" }, avoid: { t: "À éviter", d: "Impact faible, effort élevé", c: "border-border" } } as const;

function Matrix({ w, onFocusNode }: { w: Workspace; onFocusNode: (id: string) => void }) {
  const ops = opportunities(w);
  if (!ops.length) return <p className="text-xs text-muted-foreground">Aucune étape manuelle à prioriser dans le schéma actuel.</p>;
  return <div className="space-y-2"><div className="grid grid-cols-2 gap-2">{(Object.keys(QUAD) as (keyof typeof QUAD)[]).map((q) => <div key={q} className={`min-h-28 rounded-[14px] border p-2 text-xs ${QUAD[q].c}`}><p className="font-medium">{QUAD[q].t}</p><p className="mb-2 text-[10px] text-muted-foreground">{QUAD[q].d}</p>{ops.filter((o) => o.quadrant === q).map((o) => <button key={o.id} onClick={() => onFocusNode(o.id)} className="mb-1 flex w-full justify-between gap-2 rounded-lg bg-secondary px-2 py-1 text-left hover:bg-accent"><span className="truncate">{o.label}</span><span className="shrink-0 text-muted-foreground">{eur(o.impact)}</span></button>)}</div>)}</div><p className="text-[11px] text-muted-foreground">Impact = coût annuel actuel de l'étape. Effort : opération simple = faible ; validation ou étape de plus de 2 h = élevé.</p></div>;
}

export function CompareView({ w }: { w: Workspace }) {
  const asIs = w.nodes.filter((n) => !n.is_to_be).sort((a, b) => a.position_x - b.position_x || a.position_y - b.position_y);
  const toBe = w.nodes.filter((n) => n.is_to_be).sort((a, b) => a.position_x - b.position_x || a.position_y - b.position_y);
  const m = metricsFor(w);
  const col = (title: string, list: PNode[], unit: number, cycle: number) => <div className="min-w-0"><div className="mb-2 flex items-baseline justify-between"><h3 className="text-sm font-medium">{title}</h3><span className="text-[11px] text-muted-foreground">{eur(unit)}/dossier · {formatDuration(cycle)}</span></div><ol className="space-y-2">{list.map((n, i) => { const c = confidence(n); return <li key={n.id} className={`rounded-xl border p-2 text-xs ${n.is_automated ? "border-eco-eco-cyan/40" : "border-border"}`}><div className="flex justify-between gap-2"><span className="font-medium"><span className="mr-1 font-mono text-muted-foreground">{i + 1}.</span>{n.label}</span>{n.is_automated && <span className="text-[10px] text-eco-cyan">auto</span>}</div><p className="mt-1 text-[11px] text-muted-foreground">{formatDuration(Number(n.cycle_time_minutes))} de travail · {formatDuration(Number(n.wait_time_minutes))} d'attente{meta(n).ref ? ` · #${meta(n).ref}` : ""}</p><span className={`mt-1 inline-block rounded-full border px-1.5 text-[9px] ${c === "estimated" ? "border-eco-eco-amber/50 text-eco-amber" : "border-eco-eco-emerald/50 text-eco-emerald"}`}>{CONFIDENCE_LABEL[c]}</span></li>; })}</ol></div>;
  return <div className="space-y-4"><div className="grid grid-cols-3 gap-2 text-center text-xs"><Stat k="Étapes" v={`${asIs.length} → ${toBe.length}`} /><Stat k="Délai de cycle" v={`−${Math.round(m.cycleReduction)} %`} /><Stat k="Coût par dossier" v={`${eur(m.asIs.unitCost)} → ${eur(m.toBe.unitCost)}`} /></div><div className="grid gap-4 sm:grid-cols-2">{col("Avant · As-Is", asIs, m.asIs.unitCost, m.asIs.cycleMinutes)}{col("Après · To-Be", toBe, m.toBe.unitCost, m.toBe.cycleMinutes)}</div><p className="text-[11px] text-muted-foreground">Indice de confiance : « Déclaratif client » = étape appuyée sur une citation terrain ; « Estimation IA » = valeur à confirmer.</p></div>;
}
function Stat({ k, v }: { k: string; v: string }) { return <div className="eco-glass rounded-xl p-2"><p className="font-semibold">{v}</p><p className="text-[10px] text-muted-foreground">{k}</p></div>; }
