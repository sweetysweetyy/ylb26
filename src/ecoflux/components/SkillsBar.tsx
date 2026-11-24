import type { Workspace } from "@/ecoflux/lib/data";
import type { PNode, Skill, Tool } from "@/ecoflux/lib/types";
import { cn } from "@/lib/utils";

const TONES: Record<string, { dot: string; text: string }> = {
  data: { dot: "bg-eco-cyan shadow-[0_0_10px_var(--eco-cyan)]", text: "text-eco-cyan" },
  ai_agents: { dot: "bg-eco-violet shadow-[0_0_10px_var(--eco-violet)]", text: "text-eco-violet" },
  automation: { dot: "bg-eco-magenta shadow-[0_0_10px_var(--eco-magenta)]", text: "text-eco-magenta" },
  flow: { dot: "bg-eco-amber shadow-[0_0_10px_var(--eco-amber)]", text: "text-eco-amber" },
};

export type SkillDetail = { label: string; tooltip: string; nodes: Set<string>; edges: Set<string> };

/** Counted items per lever, with a plain explanation and the canvas elements to highlight. */
export function skillDetail(cat: string, w: Workspace): SkillDetail {
  const tb = w.nodes.filter((n) => n.is_to_be);
  const plural = (n: number, s: string, p: string) => `${n} ${n > 1 ? p : s}`;
  switch (cat) {
    case "data": {
      const tools = (w.clarification?.tools ?? []) as Tool[];
      const names = tools.map((t) => t.name).filter(Boolean).join(", ");
      return { label: plural(tools.length, "outil / système", "outils / systèmes"), tooltip: `Nombre d'outils et logiciels listés à l'étape Clarification${names ? ` : ${names}` : ""}. Plus il y en a, plus les données sont dispersées.`, nodes: new Set(), edges: new Set() };
    }
    case "ai_agents": {
      const ns = tb.filter((n) => n.is_automated && (n.action_type === "decision" || /agent/i.test(n.assigned_role ?? "")));
      return { label: plural(ns.length, "agent IA actif", "agents IA actifs"), tooltip: "Étapes du schéma cible confiées à un agent IA (décision ou rôle « Agent »). Cliquez pour les voir surlignées.", nodes: new Set(ns.map((n) => n.id)), edges: new Set() };
    }
    case "automation": {
      const ns = tb.filter((n) => n.is_automated);
      return { label: plural(ns.length, "tâche automatisée", "tâches automatisées"), tooltip: "Étapes du schéma cible exécutées sans intervention humaine (IA ou automatisation). Cliquez pour les voir surlignées.", nodes: new Set(ns.map((n) => n.id)), edges: new Set() };
    }
    default: {
      const byId = new Map(tb.map((n) => [n.id, n]));
      const relays = w.edges.filter((e) => e.is_to_be).filter((e) => {
        const a = byId.get(e.source_node_id), b = byId.get(e.target_node_id);
        return a && b && !a.is_automated && !b.is_automated && a.assigned_role !== b.assigned_role;
      });
      const waits = tb.filter((n) => n.color_code === "waiting_time");
      const c = relays.length + waits.length;
      return { label: plural(c, "point de friction", "points de friction"), tooltip: `${plural(relays.length, "relais manuel", "relais manuels")} entre deux personnes différentes sans outil pour faire le pont + ${plural(waits.length, "étape", "étapes")} avec temps d'attente. Cliquez pour les voir surlignés.`, nodes: new Set(waits.map((n) => n.id)), edges: new Set(relays.map((e) => e.id)) };
    }
  }
}

export function skillCount(cat: string, w: Workspace) {
  return skillDetail(cat, w).label;
}

export function skillPatch(cat: string, n: PNode): Partial<PNode> {
  const cyc = Number(n.cycle_time_minutes), wait = Number(n.wait_time_minutes);
  switch (cat) {
    case "data": return { wait_time_minutes: 0, cycle_time_minutes: Math.round(cyc * 0.6 * 10) / 10, color_code: "value_add" };
    case "ai_agents": return { action_type: n.action_type === "decision" ? "decision" : "automated_agent", is_automated: true, color_code: "automated", assigned_role: "Agent IA", cycle_time_minutes: 1, hourly_cost: 4, wait_time_minutes: 0 };
    case "automation": return { action_type: "automated_agent", is_automated: true, color_code: "automated", assigned_role: "Automatisation", cycle_time_minutes: Math.max(0.5, Math.round(cyc / 10)), hourly_cost: 2, wait_time_minutes: 0 };
    default: return { wait_time_minutes: Math.round(wait / 4), color_code: n.color_code === "waiting_time" || n.color_code === "bottleneck" ? "value_add" : n.color_code };
  }
}

export function SkillsBar({ w, focus, onFocus }: {
  w: Workspace;
  focus: string | null;
  onFocus: (s: Skill | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {w.skills.map((s) => {
        const active = w.processSkills.find((p) => p.skill_id === s.id)?.is_active ?? false;
        const t = TONES[s.category] ?? TONES["flow"]!;
        const d = skillDetail(s.category, w);
        return (
          <button key={s.id} aria-pressed={focus === s.id} onClick={() => onFocus(focus === s.id ? null : s)} title={d.tooltip} className={cn("eco-glass flex items-center gap-3 rounded-[18px] p-3 text-left text-[13px] transition hover:bg-accent", !active && "opacity-50", focus === s.id && "ring-1 ring-eco-cyan")}>
            <span className={cn("size-2 shrink-0 rounded-full", t.dot)} />
            <span className="truncate font-medium">{s.name}</span>
            <span className={cn("ml-auto shrink-0 text-[11px]", t.text)}>{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}
