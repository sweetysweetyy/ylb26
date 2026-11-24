import { X, Check, Target, Wrench, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Workspace } from "@/ecoflux/lib/data";
import { meta } from "@/ecoflux/lib/data";
import { eur, formatDuration } from "@/ecoflux/lib/engine";
import { SKILL_GUIDES, impact, isApplied, isOpportunity, skillAudit } from "@/ecoflux/lib/skills";
import type { PNode, Skill } from "@/ecoflux/lib/types";
import { skillPatch } from "./SkillsBar";

export function SkillStudio({ w, skill, selected, active, onToggle, onApply, onSelect, onClose }: {
  w: Workspace; skill: Skill; selected: PNode | null; active: boolean;
  onToggle: (v: boolean) => void; onApply: () => void; onSelect: (id: string) => void; onClose: () => void;
}) {
  const g = SKILL_GUIDES[skill.category] ?? SKILL_GUIDES["flow"]!;
  const a = skillAudit(skill, w, skillPatch);
  const sim = selected?.is_to_be ? impact(selected, skillPatch(skill.category, selected)) : null;
  const chip = (n: PNode, tone: string) => <button key={n.id} onClick={() => onSelect(n.id)} className={`rounded-full border px-2 py-0.5 text-[11px] hover:bg-accent ${tone}`}>#{meta(n).ref ?? "?"} {n.label}</button>;
  return <aside className="eco-glass flex h-full flex-col overflow-hidden rounded-[18px] text-[13px]" onPointerDown={(e) => e.stopPropagation()}>
    <div className="flex items-start justify-between gap-2 border-b border-border p-4">
      <div><p className="section-label">STUDIO D'INGÉNIERIE</p><h2 className="mt-1 text-base font-semibold">{skill.name}</h2><p className="mt-1 text-xs text-muted-foreground">{skill.description}</p></div>
      <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label="Fermer le studio" onClick={onClose}><X /></Button>
    </div>
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 font-medium"><Target className="size-4 text-eco-cyan" /> Thèse économique</h3>
        <p className="leading-relaxed">{g.thesis}</p>
        <p className="text-muted-foreground">{g.waste}</p>
        <div className="grid gap-2">
          <div className="rounded-lg bg-secondary p-3"><p className="mb-1 text-[11px] text-eco-emerald">À utiliser quand</p><ul className="list-disc space-y-1 pl-4 text-xs">{g.useWhen.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="rounded-lg bg-secondary p-3"><p className="mb-1 text-[11px] text-eco-amber">À éviter quand</p><ul className="list-disc space-y-1 pl-4 text-xs">{g.avoidWhen.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 font-medium"><Check className="size-4 text-eco-violet" /> Audit du dossier</h3>
        <p className="text-xs text-muted-foreground">Les étapes concernées sont signalées sur le schéma To-Be.</p>
        <p className="text-[11px]">Déjà transformées ({a.applied.length})</p>
        <div className="flex flex-wrap gap-1">{a.applied.length ? a.applied.map((n) => chip(n, "border-eco-eco-emerald/50 text-eco-emerald")) : <span className="text-xs text-muted-foreground">Aucune pour l'instant</span>}</div>
        <p className="pt-1 text-[11px]">Opportunités détectées ({a.opportunities.length})</p>
        <div className="flex flex-wrap gap-1">{a.opportunities.length ? a.opportunities.map((n) => chip(n, "border-eco-eco-amber/50 text-eco-amber")) : <span className="text-xs text-muted-foreground">Aucune opportunité évidente</span>}</div>
        {a.opportunities.length > 0 && <p className="rounded-lg border border-eco-eco-cyan/30 p-2 text-xs">Potentiel si appliqué partout : <span className="text-eco-cyan">−{formatDuration(a.minutes)}</span> et <span className="text-eco-cyan">{eur(a.euros)}</span> par exécution.</p>}
      </section>
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 font-medium"><Gauge className="size-4 text-eco-magenta" /> Simulateur avant / après</h3>
        {sim && selected ? <>
          <p className="text-xs">Étape « {selected.label} » {isApplied(skill.category, selected, skill) ? "· déjà transformée" : isOpportunity(skill.category, selected) ? "· opportunité" : ""}</p>
          <table className="w-full text-xs"><tbody>
            {([["Cycle", formatDuration(sim.before.cyc), formatDuration(sim.after.cyc)], ["Attente", formatDuration(sim.before.wait), formatDuration(sim.after.wait)], ["Coût horaire", eur(sim.before.cost), eur(sim.after.cost)], ["Rôle", selected.assigned_role ?? "—", skillPatch(skill.category, selected).assigned_role ?? selected.assigned_role ?? "—"]] as const).map(([k, b, c]) => <tr key={k} className="border-b border-border"><td className="py-1.5 text-muted-foreground">{k}</td><td>{b}</td><td className="text-eco-cyan">→ {c}</td></tr>)}
          </tbody></table>
          <p className="text-xs">Gain : <span className="text-eco-cyan">−{formatDuration(Math.max(0, sim.minutes))}</span> · {eur(Math.max(0, sim.euros))} par exécution</p>
          <Button className="w-full rounded-full eco-holo text-[12px]" disabled={!active} onClick={onApply}>Appliquer la transformation</Button>
        </> : <p className="text-xs text-muted-foreground">Sélectionnez une étape du schéma To-Be pour simuler l'effet.</p>}
      </section>
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 font-medium"><Wrench className="size-4 text-eco-amber" /> Mise en œuvre</h3>
        <p className="text-xs">Complexité : <span className="text-eco-amber">{g.complexity}</span> · {g.delay}</p>
        <ul className="list-disc space-y-1 pl-4 text-xs">{g.stack.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>
      <label className="flex items-center justify-between border-t border-border pt-3 text-xs">Levier actif sur ce dossier <Switch checked={active} onCheckedChange={onToggle} /></label>
    </div>
  </aside>;
}

export function SkillBreakdown({ w }: { w: Workspace }) {
  if (!w.skills.length) return null;
  return <div className="eco-glass rounded-[18px] p-3 text-xs">
    <p className="mb-2 text-muted-foreground">Contribution des 4 leviers</p>
    {w.skills.map((s) => { const a = skillAudit(s, w, skillPatch); return <div key={s.id} className="flex items-center justify-between gap-2 py-1"><span className="truncate">{s.name}</span><span className="shrink-0"><span className="text-eco-emerald">{a.applied.length} ✓</span> · <span className="text-eco-amber">{a.opportunities.length} à saisir</span></span></div>; })}
  </div>;
}
