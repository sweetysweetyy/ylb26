import { SkillBreakdown } from "./SkillStudio";
import { ChevronRight, Download, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { metricsFor } from "@/ecoflux/lib/context";
import { eur, num } from "@/ecoflux/lib/engine";
import { downloadPlaybook } from "@/ecoflux/lib/playbook";
import type { Workspace } from "@/ecoflux/lib/data";
import type { Phase, TraceAction } from "@/ecoflux/lib/types";

export function SolutionPanel({ w, onTrace, onClose, onPlaybook }: { w: Workspace; onTrace: (a: TraceAction, i: number) => void; onClose: () => void; onPlaybook: () => void }) {
  const r = w.roundUp;
  const m = metricsFor(w);
  const hard = r?.hard_cash_savings_annual ?? m.hardCash;
  const capacity = r?.capacity_revenue_potential ?? m.capacityValue;
  const actions = (r?.decisions_traceability ?? []) as TraceAction[];
  const phases = (r?.phases ?? []) as Phase[];
  return <aside className="solution-panel flex min-h-0 flex-col gap-3 overflow-y-auto">
    <div className="flex items-center justify-between"><h2 className="section-label">ÉTAPE 3 · L’ULTIME SOLUTION</h2><Button variant="ghost" size="icon" aria-label="Replier la solution" className="size-6" onClick={onClose}><ChevronRight /></Button></div>
    <div className="eco-holo impact-box rounded-[18px] p-5"><p className="text-xs text-muted-foreground">Gain net annuel estimé</p><p className="my-2 text-[30px] font-semibold leading-tight text-eco-cyan">+{eur(hard + capacity)}<span className="text-lg">/an</span></p><p className="text-xs text-muted-foreground">{r ? `ROI en ${Math.ceil(r.payback_days / 7)} semaines · J+${r.payback_days}` : "Projection · Round Up à générer"}</p></div>
    <div className="grid grid-cols-2 gap-3"><div className="eco-glass rounded-[18px] p-3"><p className="text-xl font-semibold">−{Math.round(r?.cycle_time_reduction_percent ?? m.cycleReduction)} %</p><p className="mt-1 text-xs text-muted-foreground">Délai de cycle</p></div><div className="eco-glass rounded-[18px] p-3"><p className="text-xl font-semibold">{w.nodes.filter((n) => n.is_to_be && n.is_automated).length}</p><p className="mt-1 text-xs text-muted-foreground">Étapes automatisées</p></div></div>
    <div className="eco-glass rounded-[18px] p-3"><ol className="space-y-1">{actions.map((a, i) => <li key={i}><Button variant="ghost" className="h-auto w-full justify-start gap-3 whitespace-normal px-1 py-2 text-left text-xs" onClick={() => onTrace(a, i)}><span className="font-mono text-eco-violet">{String(i + 1).padStart(2, "0")}</span><span>{a.title}</span>{a.chat_message_id && a.citation ? <Link2 aria-label="Source vérifiée" className="ml-auto shrink-0 text-eco-violet" /> : <span title="Recommandation sans citation vérifiée" className="ml-auto shrink-0 rounded-full border border-eco-eco-amber/50 px-1.5 text-[9px] text-eco-amber">à sourcer</span>}</Button></li>)}</ol>{r ? <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">{actions.filter((a) => a.chat_message_id && a.citation).length}/{actions.length} décisions appuyées sur une citation vérifiée. Cliquez une action pour voir sa source sur le schéma.</p> : <p className="py-2 text-xs text-muted-foreground">Aucune solution consolidée. Lancez le Round Up une fois le schéma cible prêt.</p>}</div>
    <SkillBreakdown w={w} />
    <Button className="eco-aig rounded-full text-primary-foreground" disabled={!r} onClick={() => downloadPlaybook(w)}><Download /> Exporter le playbook</Button>
    <Button variant="secondary" className="rounded-full border border-border" disabled={!r} onClick={onPlaybook}><FileText /> Playbook opérationnel</Button>
    <details className="border-t border-border pt-3 text-xs"><summary className="cursor-pointer text-muted-foreground">Détail économique & calendrier</summary><dl className="my-4 space-y-2"><div className="flex justify-between"><dt>Hard Cash estimé</dt><dd className="text-eco-emerald">{eur(hard)}/an</dd></div><div className="flex justify-between"><dt>Capacité marchande</dt><dd className="text-eco-cyan">{eur(capacity)}/an</dd></div><div className="flex justify-between"><dt>Heures libérées</dt><dd>{num(r?.capacity_unlocked_hours_annual ?? m.hoursFreed)} h/an</dd></div><div className="flex justify-between"><dt>Investissement</dt><dd>{eur(r?.implementation_cost ?? m.implementationCost)}</dd></div><div className="flex justify-between"><dt>Coût unitaire</dt><dd>{eur(m.asIs.unitCost)} → {eur(m.toBe.unitCost)}</dd></div></dl><p className="mb-4 text-muted-foreground">La capacité marchande est un potentiel, non une économie de trésorerie garantie.</p>{phases.map((p) => <div key={p.phase} className="mb-4"><h3 className="mb-2 font-medium text-eco-violet">{p.title}</h3>{(p.steps ?? []).map((s, i) => <p key={i} className="mb-1 text-muted-foreground">{s}</p>)}</div>)}</details>
  </aside>;
}