import { Diamond, Hexagon, Circle, Square } from "lucide-react";
import type { ActionType, ColorCode, PNode } from "@/ecoflux/lib/types";

export const COLOR_LABEL: Record<ColorCode, string> = {
  value_add: "Valeur ajoutée",
  bottleneck: "Goulot critique",
  waiting_time: "Attente / friction",
  automated: "Automatisation / agent",
};
export const TYPE_LABEL: Record<ActionType, string> = {
  operation: "Opération",
  decision: "Décision / contrôle",
  automated_agent: "Automatisation / agent IA",
  event: "Déclencheur / événement",
};
export const TYPE_ICON: Record<ActionType, typeof Square> = {
  operation: Square,
  decision: Diamond,
  automated_agent: Hexagon,
  event: Circle,
};

export function tone(n: Pick<PNode, "color_code" | "action_type" | "assigned_role">) {
  if (n.color_code === "automated") {
    return /agent/i.test(n.assigned_role ?? "") || n.action_type === "decision" ? "violet" : "cyan";
  }
  return ({ value_add: "emerald", bottleneck: "carmine", waiting_time: "amber" } as const)[n.color_code];
}
export type Tone = ReturnType<typeof tone>;

export const TONE_TEXT: Record<Tone, string> = {
  cyan: "text-eco-cyan", violet: "text-eco-violet", emerald: "text-eco-emerald", carmine: "text-eco-carmine", amber: "text-eco-amber",
};
export const TONE_BORDER: Record<Tone, string> = {
  cyan: "border-eco-eco-cyan/35 shadow-[0_0_22px_-6px_var(--eco-cyan)]",
  violet: "border-eco-eco-violet/35 shadow-[0_0_22px_-8px_var(--eco-violet)]",
  emerald: "border-eco-eco-emerald/35 shadow-[0_0_22px_-8px_var(--eco-emerald)]",
  carmine: "border-eco-eco-carmine/50 shadow-[0_0_24px_-6px_var(--eco-carmine)]",
  amber: "border-eco-eco-amber/30 shadow-[0_0_22px_-10px_var(--eco-amber)]",
};
export const TONE_VAR: Record<Tone, string> = {
  cyan: "var(--eco-cyan)", violet: "var(--eco-violet)", emerald: "var(--eco-emerald)", carmine: "var(--eco-carmine)", amber: "var(--eco-amber)",
};

export function nodeSize(t: ActionType) {
  return t === "event" ? { w: 152, h: 62 } : { w: 148, h: 84 };
}

export function shapeClass(t: ActionType) {
  switch (t) {
    case "event": return "rounded-full px-5";
    case "automated_agent": return "rounded-[42px] px-5";
    case "decision": return "rounded-[4px] px-3.5 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]";
    default: return "rounded-[14px] px-3.5";
  }
}
