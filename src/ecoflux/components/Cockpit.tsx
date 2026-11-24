import { eco } from "@/ecoflux/lib/db";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, ChevronLeft, Maximize2, Minimize2, ArrowLeft, Loader2, MessageSquare, Plus, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { author, buildContext, exchangeNo, metricsFor } from "@/ecoflux/lib/context";
import { meta, patchWs, updateNode, wsKey, type Workspace } from "@/ecoflux/lib/data";
import { roundUpProcess } from "@/ecoflux/lib/ai.functions";
import { playbookText, resolveActions } from "@/ecoflux/lib/playbook";
import type { PNode, Skill, TraceAction } from "@/ecoflux/lib/types";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { SkillsBar, skillDetail, skillPatch } from "./SkillsBar";
import { SkillStudio } from "./SkillStudio";
import { isApplied, isOpportunity } from "@/ecoflux/lib/skills";
import { ClarificationPanel } from "./ClarificationPanel";
import { SolutionPanel } from "./SolutionPanel";
import { Avatar, Composer, Messages } from "./ChatThread";
import { useCopilot } from "./useCopilot";
import { nodeDelta, nodeSource, toBeSummary } from "@/ecoflux/lib/sources";
import { ShieldAlert, Columns2, Lightbulb } from "lucide-react";
import { CompareView, InsightsPanel, SuggestionChips } from "./Insights";
import { LabEcosystem, ecosystemOf, labApp } from "./LabEcosystem";
import { Network } from "lucide-react";

export function Cockpit({ w }: { w: Workspace }) {
  const qc = useQueryClient();
  const roundUp = useServerFn(roundUpProcess);
  const [toBe, setToBe] = useState(true);
  const [left, setLeft] = useState(w.nodes.length === 0);
  const [right, setRight] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [traceIndex, setTraceIndex] = useState<number | null>(2);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [zen, setZen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [ecoOpen, setEcoOpen] = useState(false);
  const labEco = ecosystemOf(w);
  const [studioId, setStudioId] = useState<string | null>(null);
  const studio = w.skills.find((s) => s.id === studioId) ?? null;
  const studioActive = studio ? w.processSkills.find((p) => p.skill_id === studio.id)?.is_active ?? false : false;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setZen(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const chat = useCopilot(w);
  const actions = (w.roundUp?.decisions_traceability ?? []) as TraceAction[];
  const trace = traceIndex === null ? null : actions[traceIndex] ?? null;
  const traceMessage = w.messages.find((m) => m.id === trace?.chat_message_id);
  const selected = w.nodes.find((n) => n.id === selectedId) ?? null;
  const nodes = w.nodes.filter((n) => n.is_to_be === toBe);
  const edges = w.edges.filter((e) => e.is_to_be === toBe);
  const refresh = () => qc.invalidateQueries({ queryKey: wsKey(w.process.id) });
  async function guard(fn: () => Promise<unknown>) { try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "La modification n’a pas été enregistrée."); await refresh(); } }
  const changeNode = (n: PNode, patch: Partial<PNode>) => guard(async () => {
    await updateNode(n.id, patch);
    patchWs(qc, w.process.id, (x) => ({ ...x, nodes: x.nodes.map((v) => v.id === n.id ? { ...v, ...patch } : v) }));
  });
  async function consolidate() {
    setPending(true);
    try {
      const result = await roundUp({ data: { context: buildContext(w, true) } });
      const m = metricsFor(w);
      const resolved = resolveActions(w, result.actions);
      const { error } = await eco(supabase).from("eco_round_up_solutions").insert({ process_id: w.process.id, executive_summary: result.executive_summary, hard_cash_savings_annual: m.hardCash, capacity_unlocked_hours_annual: m.hoursFreed, capacity_revenue_potential: m.capacityValue, implementation_cost: m.implementationCost, payback_days: m.paybackDays ?? 0, cycle_time_reduction_percent: m.cycleReduction, velocity_market_gain: result.velocity_market_gain, phases: result.phases, decisions_traceability: resolved as never });
      if (error) throw error;
      await refresh(); setRight(true); setTraceIndex(0);
      toast.success("L’Ultime Solution est prête");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Le Round Up a échoué."); }
    finally { setPending(false); }
  }
  const onTrace = (a: TraceAction, i: number) => { setToBe(true); setSelectedId(null); setTraceIndex(i); setFocusKey(a.node_id ? `${a.node_id}:${Date.now()}` : null); };
  const onToggle = (s: Skill, active: boolean) => guard(async () => { const { error } = await eco(supabase).from("eco_process_skills").upsert({ process_id: w.process.id, skill_id: s.id, is_active: active }, { onConflict: "process_id,skill_id" }); if (error) throw error; await refresh(); });
  const addNode = () => guard(async () => {
    const { data, error } = await eco(supabase).from("eco_process_nodes").insert({ process_id: w.process.id, is_to_be: toBe, label: "Nouvelle opération", action_type: "operation", color_code: "value_add", position_x: 80, position_y: 400, metadata: { ref: `${toBe ? "N" : "A"}${Date.now().toString().slice(-5)}` } }).select().single();
    if (error) throw error; await refresh(); setSelectedId(data.id);
  });
  const sum = toBeSummary(w);
  const badge = (n: PNode) => {
    const d = toBe ? nodeDelta(w, n) : null;
    const missing = nodeSource(w, n).kind === "missing";
    const la = toBe ? labEco?.assignments.find((a) => a.node_ref === meta(n).ref) : undefined;
    return <>
      {la && <span title={la.reason} className={`rounded-full border bg-card px-1.5 py-px text-[9px] ${la.app_key ? "border-eco-eco-cyan/60 text-eco-cyan" : "border-eco-eco-amber/60 text-eco-amber"}`}>{la.app_key ? labApp(la.app_key)?.name ?? la.app_key : "+ App à créer"}</span>}
      {d && d.kind !== "unchanged" && <span className="rounded-full border border-eco-eco-magenta/50 bg-card px-1.5 py-px text-[9px] text-eco-magenta shadow-[0_0_10px_-2px_var(--eco-magenta)]">{d.label}</span>}
      {studio && toBe && (isApplied(studio.category, n, studio) ? <span className="rounded-full border border-eco-eco-emerald/60 bg-card px-1.5 py-px text-[9px] text-eco-emerald">✓ levier</span> : isOpportunity(studio.category, n) ? <span className="animate-pulse rounded-full border border-eco-eco-amber/60 bg-card px-1.5 py-px text-[9px] text-eco-amber">◎ opportunité</span> : null)}
      {missing && <span title="Source manquante" className="grid size-4 place-items-center rounded-full border border-eco-eco-amber/60 bg-card text-eco-amber"><ShieldAlert className="size-2.5" /></span>}
    </>;
  };
  return <main className={`cockpit-shell ${zen ? "zen" : ""}`}>
    {!zen && <div className="group fixed bottom-4 left-4 z-40">
      <div className="invisible absolute bottom-full left-0 pb-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="eco-glass flex w-56 flex-col gap-2 rounded-2xl border border-border p-2">
          <Link to="/ecoflux/dashboard" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-accent" title="Dossiers clients"><ArrowLeft className="size-3.5" /> Dossiers</Link>
          <div className="flex items-center rounded-full border border-border bg-secondary p-1">{[false, true].map((v) => <Button key={String(v)} variant="ghost" size="sm" aria-pressed={toBe === v} className={`flex-1 rounded-full text-xs ${toBe === v ? "bg-accent text-foreground" : "text-muted-foreground"}`} onClick={() => { setToBe(v); setSelectedId(null); }}>{v ? "To-Be" : "As-Is"}</Button>)}</div>
          <Button variant="secondary" size="sm" className="justify-start rounded-full text-xs" onClick={() => setInsightsOpen(true)}><Lightbulb className="text-eco-amber" /> Analyse</Button>
          <Button variant="secondary" size="sm" className="justify-start rounded-full text-xs" onClick={() => setCompareOpen(true)}><Columns2 /> Avant / Après</Button>
          <Button variant="secondary" size="sm" className="justify-start rounded-full text-xs" onClick={() => setEcoOpen(true)}><Network className="text-eco-cyan" /> Écosystème Lab</Button>
          <Button variant="outline" className="eco-holo justify-start rounded-full text-xs" disabled={pending || !w.nodes.length} onClick={consolidate}>{pending ? <Loader2 className="animate-spin" /> : <Zap className="text-eco-amber" />} {pending ? "Consolidation…" : "Round Up"}</Button>
        </div>
      </div>
      <Button variant="outline" size="sm" className="eco-holo rounded-full text-xs" aria-label="Actions du dossier"><Zap className="text-eco-amber" /> {toBe ? "To-Be" : "As-Is"} · Actions</Button>
    </div>}
    {!zen && <>    <SkillsBar w={w} focus={studioId} onFocus={(s) => { setStudioId(s?.id ?? null); if (s) setToBe(true); }} /></>}
    <div className={`workspace-grid ${!zen && left ? "left-open" : ""} ${!zen && right ? "right-open" : ""}`}>
      {zen ? null : left ? <ClarificationPanel key={w.process.id} w={w} onClose={() => setLeft(false)} /> : <div className="clarification-rail eco-glass"><Button variant="ghost" size="icon" aria-label="Ouvrir la clarification" onClick={() => setLeft(true)}><ChevronRight /></Button><span>ÉTAPE 1 · CLARIFICATION</span></div>}
      <section className="canvas-section relative min-h-0 min-w-0">
        <Canvas nodes={nodes} edges={edges} selectedId={selectedId} highlightId={toBe ? trace?.node_id ?? null : null} focusKey={focusKey} badge={badge} marked={studio && toBe ? skillDetail(studio.category, w) : null} onSelect={(id) => setSelectedId(id)} onMove={(id, x, y, commit) => {
          patchWs(qc, w.process.id, (a) => ({ ...a, nodes: a.nodes.map((n) => n.id === id ? { ...n, position_x: x, position_y: y } : n) }));
          if (commit) void guard(() => updateNode(id, { position_x: x, position_y: y }));
        }} overlay={(n, p) => trace ? <div className="eco-holo-card trace-card absolute rounded-[18px] p-4" style={{ left: p.x - 28, top: p.y + p.h + 20, width: 338 }} onPointerDown={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between gap-4 text-[11px]"><span className="text-muted-foreground">TRAÇABILITÉ · ACTION {(traceIndex ?? 0) + 1}</span><span className="text-eco-violet">Nœud #{meta(n).ref}</span><Button variant="ghost" size="icon" className="size-5" aria-label="Fermer la traçabilité" onClick={() => setTraceIndex(null)}><X /></Button></div>
          <p className="text-sm leading-relaxed">{trace.citation ? `« ${trace.citation} »` : trace.title}</p>
          {traceMessage ? <Button variant="ghost" className="my-3 h-auto gap-2 px-0 text-[11px] text-muted-foreground" onClick={() => setChatOpen(true)}><Avatar name={author(traceMessage)} />{author(traceMessage)} · échange {exchangeNo(traceMessage, w.messages)}</Button> : <p className="my-3 text-xs text-muted-foreground">Recommandation sans citation vérifiée</p>}
          {trace.rule && <p className="rounded-lg bg-secondary px-2 py-3 font-mono text-[11px] leading-relaxed text-eco-cyan">→ {trace.rule}</p>}
        </div> : null} footer={<>
          {toBe && sum.total > 0 && <div className="pointer-events-none absolute left-1/2 top-3 max-w-[70%] -translate-x-1/2 rounded-full border border-eco-eco-cyan/30 bg-card/90 px-4 py-1.5 text-center text-[11px] backdrop-blur"><span className="text-eco-cyan">Schéma cible</span><span className="text-muted-foreground"> · le processus après optimisation · </span>{sum.automated} automatisée{sum.automated > 1 ? "s" : ""} · {sum.faster} accélérée{sum.faster > 1 ? "s" : ""} · {sum.created} nouvelle{sum.created > 1 ? "s" : ""} · <span className={sum.sourced < sum.total ? "text-eco-amber" : "text-eco-emerald"}>{sum.sourced}/{sum.total} sourcées</span></div>}
          {!toBe && nodes.length > 0 && <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-border bg-card/90 px-4 py-1.5 text-[11px] text-muted-foreground backdrop-blur">Schéma actuel · le processus tel qu'il fonctionne aujourd'hui</div>}
          <div className="absolute left-3 top-3 flex gap-1" onPointerDown={(e) => e.stopPropagation()}><Button variant="secondary" size="icon" className="size-7" title="Ajouter une opération" aria-label="Ajouter une opération" onClick={addNode}><Plus /></Button><Button variant="secondary" size="icon" className="size-7" title="Historique du copilote" aria-label="Historique du copilote" onClick={() => setChatOpen(true)}><MessageSquare /></Button></div>
          <Button variant="secondary" size="icon" className="absolute right-3 top-3 size-7" title={zen ? "Quitter le plein écran (Échap)" : "Plein écran"} aria-label={zen ? "Quitter le plein écran" : "Plein écran"} onPointerDown={(e) => e.stopPropagation()} onClick={() => setZen(!zen)}>{zen ? <Minimize2 /> : <Maximize2 />}</Button>
          {!zen && <div className="canvas-composer absolute bottom-14 left-3 right-3" onPointerDown={(e) => e.stopPropagation()}><div className="mb-2"><SuggestionChips w={w} node={null} disabled={chat.pending} onPick={(t) => { setChatOpen(true); void chat.send(t, null); }} /></div><Composer onSend={(t) => { setChatOpen(true); void chat.send(t, null); }} pending={chat.pending} placeholder="Challenger le processus…" /></div>}
        </>} />
        {studio && <div className="absolute inset-y-0 left-0 z-20 w-[360px] max-w-full"><SkillStudio w={w} skill={studio} selected={selected} active={studioActive} onToggle={(v) => onToggle(studio, v)} onSelect={setSelectedId} onClose={() => setStudioId(null)} onApply={() => selected && void changeNode(selected, { ...skillPatch(studio.category, selected), metadata: { ...(selected.metadata as object), source: `${studio.name} — ${studio.description}` } as PNode["metadata"] })} /></div>}
        {selected && <div className="inspector-overlay absolute inset-y-0 right-0 z-20 w-[340px] max-w-full"><Inspector w={w} node={selected} onChange={(p) => void changeNode(selected, p)} onClose={() => setSelectedId(null)} onOpenMessage={() => setChatOpen(true)} chat={chat} onDelete={() => {
          if (!window.confirm(`Supprimer « ${selected.label} » ?`)) return;
          void guard(async () => { const { error } = await eco(supabase).from("eco_process_nodes").delete().eq("id", selected.id); if (error) throw error; setSelectedId(null); await refresh(); });
        }} onDisconnect={(edgeId) => void guard(async () => { const { error } = await eco(supabase).from("eco_process_edges").delete().eq("id", edgeId); if (error) throw error; await refresh(); })} onConnect={(target) => void guard(async () => { const { error } = await eco(supabase).from("eco_process_edges").insert({ process_id: w.process.id, source_node_id: selected.id, target_node_id: target, is_to_be: selected.is_to_be }); if (error) throw error; await refresh(); })} /></div>}
      </section>
      {zen ? null : right ? <SolutionPanel w={w} onTrace={onTrace} onClose={() => setRight(false)} onPlaybook={() => setPlaybookOpen(true)} /> : <div className="solution-rail"><Button variant="ghost" size="icon" aria-label="Ouvrir la solution" onClick={() => setRight(true)}><ChevronLeft /></Button></div>}
    </div>
    <Dialog open={chatOpen} onOpenChange={setChatOpen}><DialogContent className="flex max-h-[85dvh] max-w-xl flex-col"><DialogHeader><DialogTitle>Copilote · {w.process.title}</DialogTitle></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto py-3"><Messages messages={w.messages} all={w.messages} pending={chat.pending} empty="Aucun échange pour ce dossier." /></div><SuggestionChips w={w} node={null} disabled={chat.pending} onPick={(t) => void chat.send(t, null)} /><Composer onSend={(t) => void chat.send(t, null)} pending={chat.pending} placeholder="Challenger le modèle…" /></DialogContent></Dialog>
    <Dialog open={insightsOpen} onOpenChange={setInsightsOpen}><DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Analyse intelligente · {w.process.title}</DialogTitle></DialogHeader><InsightsPanel w={w} onFocusNode={(id) => { const n = w.nodes.find((x) => x.id === id); if (n) { setToBe(n.is_to_be); setSelectedId(id); setFocusKey(`${id}:${Date.now()}`); } setInsightsOpen(false); }} onApplied={() => { setToBe(true); setSelectedId(null); setInsightsOpen(false); }} /></DialogContent></Dialog>
    <Dialog open={compareOpen} onOpenChange={setCompareOpen}><DialogContent className="max-h-[85dvh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Avant / Après · {w.process.title}</DialogTitle></DialogHeader><CompareView w={w} /></DialogContent></Dialog>
    <LabEcosystem w={w} open={ecoOpen} onOpenChange={setEcoOpen} onFocusNode={(id) => { setEcoOpen(false); setToBe(true); setSelectedId(id); setFocusKey(`${id}:${Date.now()}`); }} />
    <Dialog open={playbookOpen} onOpenChange={setPlaybookOpen}><DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Playbook de transformation</DialogTitle></DialogHeader><div className="whitespace-pre-wrap text-sm leading-relaxed">{w.roundUp ? playbookText(w) : "Aucun Round Up."}</div></DialogContent></Dialog>
  </main>;
}