import { useEffect, useState } from "react";
import { BookOpen, Cog, HelpCircle, Link2, Quote, ShieldAlert, Sparkles, StickyNote, Trash2, X } from "lucide-react";
import { stepUnitCost, eur, formatDuration } from "@/ecoflux/lib/engine";
import { meta, type Workspace } from "@/ecoflux/lib/data";
import { toEngine } from "@/ecoflux/lib/context";
import { nodeDelta, nodeSource } from "@/ecoflux/lib/sources";
import type { ActionType, ColorCode, PNode } from "@/ecoflux/lib/types";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { COLOR_LABEL, TYPE_LABEL, tone, TONE_BORDER, TONE_TEXT } from "./grammar";
import { Composer, Messages } from "./ChatThread";
import { SuggestionChips } from "./Insights";
import { CostProof } from "./CostProof";
import { economicScenario } from "@/ecoflux/lib/economics";
import type { LabEcosystem } from "@/ecoflux/lib/ecosystem";

const field = "w-full rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[13px] outline-none focus:border-eco-eco-violet/60";

const TYPE_HELP: Record<ActionType, string> = {
  operation: "Une tâche réalisée par une personne.",
  decision: "Un choix ou un contrôle qui oriente la suite du flux.",
  automated_agent: "Une tâche prise en charge par un outil ou un agent IA.",
  event: "Ce qui déclenche ou termine le processus.",
};
const COLOR_HELP: Record<ColorCode, string> = {
  value_add: "Le client paierait pour cette étape.",
  bottleneck: "L'étape qui ralentit tout le flux.",
  waiting_time: "Le dossier attend sans que rien n'avance.",
  automated: "Étape exécutée sans intervention humaine.",
};

function Help({ text }: { text: string }) {
  return <span title={text} className="inline-grid cursor-help text-muted-foreground"><HelpCircle className="size-3" /></span>;
}
function Section({ n, title, help, children }: { n: number; title: string; help: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-full border border-eco-eco-violet/40 font-mono text-[10px] text-eco-violet">{n}</span>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em]">{title}</h3>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">{help}</p>
      {children}
    </section>
  );
}

export function Inspector({ w, node, onChange, onDelete, onConnect, onDisconnect, onClose, onOpenMessage, chat }: {
  w: Workspace;
  node: PNode;
  onChange: (patch: Partial<PNode>) => void;
  onDelete: () => void;
  onConnect: (targetId: string) => void;
  onDisconnect: (edgeId: string) => void;
  onClose: () => void;
  onOpenMessage: () => void;
  chat: { send: (t: string, nodeId: string | null) => void; pending: boolean };
}) {
  const md = meta(node) as ReturnType<typeof meta> & { note?: string };
  const [label, setLabel] = useState(node.label);
  const [role, setRole] = useState(node.assigned_role ?? "");
  const [note, setNote] = useState(md.note ?? "");
  useEffect(() => { setLabel(node.label); setRole(node.assigned_role ?? ""); setNote(md.note ?? ""); }, [node.id, node.label, node.assigned_role, md.note]);
  const c = stepUnitCost(toEngine(node), { annualVolume: Number(w.process.annual_volume), reworkRatePercent: Number(w.clarification?.rework_rate_percent ?? 0), monthlyLicences: 0 });
  const others = w.nodes.filter((n) => n.is_to_be === node.is_to_be && n.id !== node.id && !w.edges.some((e) => e.source_node_id === node.id && e.target_node_id === n.id));
  const links = w.edges.filter((e) => e.source_node_id === node.id || e.target_node_id === node.id).map((e) => {
    const outgoing = e.source_node_id === node.id;
    const other = w.nodes.find((n) => n.id === (outgoing ? e.target_node_id : e.source_node_id));
    return { id: e.id, outgoing, other };
  });
  const msgs = w.messages.filter((m) => m.node_id === node.id);
  const src = nodeSource(w, node);
  const delta = nodeDelta(w, node);
  const tn = tone(node);
  const eco = (w.process as unknown as { lab_ecosystem?: LabEcosystem | null }).lab_ecosystem ?? null;
  const scen = economicScenario(w, eco);
  const SrcIcon = { citation: Quote, message: Link2, skill: Sparkles, terrain: BookOpen, engineering: Cog, note: StickyNote, missing: ShieldAlert }[src.kind];
  const work = Number(node.cycle_time_minutes), wait = Number(node.wait_time_minutes);
  const numInput = (k: "cycle_time_minutes" | "wait_time_minutes" | "hourly_cost", lbl: string, unit: string, help: string) => (
    <label className="space-y-1">
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">{lbl} <Help text={help} /></span>
      <div className="relative">
        <input type="number" min={0} step="any" key={`${node.id}-${k}-${node[k]}`} defaultValue={Number(node[k])} onBlur={(e) => onChange({ [k]: Math.max(0, Number(e.target.value) || 0) })} className={field} />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">{unit}</span>
      </div>
    </label>
  );
  return (
    <aside className={cn("flex h-full flex-col overflow-hidden rounded-[18px] border bg-card/95 backdrop-blur-xl", TONE_BORDER[tn])}>
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="uppercase tracking-[0.14em] text-muted-foreground">#{md.ref}</span>
            <span className={cn("rounded-full border px-2 py-0.5", node.is_to_be ? "border-eco-eco-cyan/40 text-eco-cyan" : "border-border text-muted-foreground")}>{node.is_to_be ? "To-Be · cible" : "As-Is · actuel"}</span>
            <span className={cn("rounded-full border border-current/30 px-2 py-0.5", TONE_TEXT[tn])}>{COLOR_LABEL[node.color_code]}</span>
            {delta && delta.kind !== "unchanged" && <span className="rounded-full border border-eco-eco-magenta/40 px-2 py-0.5 text-eco-magenta">{delta.label}</span>}
          </div>
          <div className="mt-1 truncate text-[14px] font-semibold">{node.label}</div>
        </div>
        <button aria-label="Fermer" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-accent"><X className="size-4" /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <section className={cn("space-y-2 rounded-xl border p-3", node.is_to_be ? "border-eco-eco-cyan/40 bg-eco-eco-cyan/5" : "border-eco-eco-violet/40 bg-eco-eco-violet/5")}>
          <h3 className={cn("text-[12px] font-semibold uppercase tracking-[0.1em]", node.is_to_be ? "text-eco-cyan" : "text-eco-violet")}>{node.is_to_be ? "Pourquoi ce nœud existe" : "D'où vient cette étape"}</h3>
          {!node.is_to_be && md.source_quote?.trim() && <p className="border-l-2 border-eco-eco-violet/50 pl-2 text-[12px] italic leading-relaxed text-foreground/90">« {md.source_quote} »</p>}
          {md.explanation?.trim() ? <p className="text-[12px] leading-relaxed text-foreground/90">{md.explanation}</p>
            : !md.source_quote?.trim() && <p className="text-[12px] leading-relaxed text-muted-foreground">Aucune explication enregistrée pour cette étape. Relancez la clarification pour la générer, ou ajoutez une justification plus bas.</p>}
        </section>
        <Section n={1} title="Opération" help="Ce qui est fait, sous quelle forme, et par qui.">
          <label className="block space-y-1"><span className="text-[11px] text-muted-foreground">Nom de l'étape</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label.trim() && label !== node.label && onChange({ label: label.trim() })} className={field} /></label>
          <label className="block space-y-1"><span className="flex items-center gap-1 text-[11px] text-muted-foreground">Type d'étape <Help text={TYPE_HELP[node.action_type]} /></span>
            <select value={node.action_type} onChange={(e) => onChange({ action_type: e.target.value as ActionType })} className={field}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <span className="block text-[11px] text-muted-foreground">{TYPE_HELP[node.action_type]}</span></label>
          <label className="block space-y-1"><span className="flex items-center gap-1 text-[11px] text-muted-foreground">Diagnostic <Help text="La couleur du nœud sur le schéma." /></span>
            <select value={node.color_code} onChange={(e) => onChange({ color_code: e.target.value as ColorCode })} className={field}>
              {Object.entries(COLOR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <span className="block text-[11px] text-muted-foreground">{COLOR_HELP[node.color_code]}</span></label>
          <label className="block space-y-1"><span className="text-[11px] text-muted-foreground">Responsable</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} onBlur={() => role !== (node.assigned_role ?? "") && onChange({ assigned_role: role || null })} placeholder="Ex. Comptable, Agent IA, ERP" className={field} /></label>
          <label className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[12px]">
            Exécutée par un agent ou une automatisation
            <Switch checked={node.is_automated} onCheckedChange={(v) => onChange({ is_automated: v, ...(v ? { color_code: "automated" as const } : {}) })} />
          </label>
        </Section>

        <Section n={2} title="Temps & coût" help="Base du calcul économique (méthode TDABC : coût = temps × coût horaire).">
          <div className="grid grid-cols-3 gap-2">
            {numInput("cycle_time_minutes", "Travail", "min", "Temps où quelqu'un (ou un outil) travaille réellement sur le dossier.")}
            {numInput("wait_time_minutes", "Attente", "min", "Temps où le dossier patiente avant d'être repris.")}
            {numInput("hourly_cost", "Coût", "€/h", "Coût horaire chargé de la ressource qui réalise l'étape.")}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border p-2.5"><div className="flex items-center gap-1 text-muted-foreground">Coût par dossier <Help text="Temps de travail × coût horaire, plus le coût des reprises et de l'attente." /></div><div className="text-[15px] font-semibold text-eco-cyan">{eur(c.total)}</div></div>
            <div className="rounded-lg border border-border p-2.5"><div className="text-muted-foreground">Délai de l'étape</div><div className="text-[15px] font-semibold">{formatDuration(work + wait)}</div></div>
          </div>
          <CostProof node={node} eco={eco} reworkRatePercent={scen.p.rework_rate_percent} latencyCostPerHour={scen.p.latency_cost_per_hour} />
        </Section>

        <Section n={3} title="Source de la décision" help="Toute étape doit reposer sur une preuve : citation, échange ou règle.">
          <div className={cn("rounded-lg border p-2.5 text-[12px]", src.kind === "missing" ? "border-eco-eco-amber/50 bg-eco-eco-amber/5" : "border-eco-eco-violet/40 bg-eco-eco-violet/5")}>
            <div className={cn("mb-1 flex items-center gap-1.5 font-medium", src.kind === "missing" ? "text-eco-amber" : "text-eco-violet")}><SrcIcon className="size-3.5" />{src.label}</div>
            <p className="leading-relaxed text-foreground/90">{src.detail}</p>
            {src.messageId && <button onClick={onOpenMessage} className="mt-1.5 text-[11px] text-eco-cyan hover:underline">Voir l'échange d'origine →</button>}
          </div>
          <label className="block space-y-1"><span className="text-[11px] text-muted-foreground">Justification du consultant</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (md.note ?? "") && onChange({ metadata: { ...(node.metadata as object), note } as PNode["metadata"] })} placeholder="Ex. Entretien avec la DAF du 12/11, document de procédure v3…" className={field} /></label>
        </Section>

        <Section n={4} title="Enchaînement" help="Étapes précédentes et suivantes dans le flux.">
          {links.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-[12px]">
              <span className="truncate"><span className="text-muted-foreground">{l.outgoing ? "Suivante :" : "Précédente :"}</span> #{l.other ? meta(l.other).ref : "?"} · {l.other?.label ?? "Nœud supprimé"}</span>
              <button aria-label="Supprimer la liaison" title="Supprimer la liaison" onClick={() => onDisconnect(l.id)} className="grid size-6 shrink-0 place-items-center rounded-full text-eco-carmine hover:bg-eco-eco-carmine/10"><X className="size-3.5" /></button>
            </div>
          ))}
          {others.length > 0 && (
            <select value="" onChange={(e) => e.target.value && onConnect(e.target.value)} className={field} aria-label="Relier à">
              <option value="">Ajouter une étape suivante…</option>
              {others.map((o) => <option key={o.id} value={o.id}>#{meta(o).ref} · {o.label}</option>)}
            </select>
          )}
        </Section>

        <div className="space-y-2 pt-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Dialogue sur cette étape</div>
          <Messages messages={msgs} all={w.messages} pending={chat.pending} empty="Posez une question : chaque réponse du copilote devient une source rattachée à cette étape." />
        </div>
      </div>
      <div className="space-y-2 border-t border-border p-3">
        <SuggestionChips w={w} node={node} disabled={chat.pending} onPick={(t) => void chat.send(t, node.id)} />
        <Composer onSend={(t) => chat.send(t, node.id)} pending={chat.pending} placeholder={`Challenger #${md.ref}…`} />
        <button onClick={onDelete} className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] text-eco-carmine hover:bg-eco-eco-carmine/10"><Trash2 className="size-3.5" /> Supprimer cette étape</button>
      </div>
    </aside>
  );
}
