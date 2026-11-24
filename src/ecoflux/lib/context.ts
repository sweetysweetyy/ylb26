import { compare, formatDuration, eur } from "./engine";
import { meta, type Workspace } from "./data";
import type { Actor, ChatMessage, CostDriver, PNode, Tool } from "./types";

export const toEngine = (n: PNode) => ({
  id: n.id, label: n.label,
  cycle_time_minutes: Number(n.cycle_time_minutes), wait_time_minutes: Number(n.wait_time_minutes),
  hourly_cost: Number(n.hourly_cost), is_automated: n.is_automated,
});

export function exchangeNo(m: ChatMessage, all: ChatMessage[]) {
  const e = (m.metadata as { exchange?: number })?.exchange;
  return typeof e === "number" ? e : all.indexOf(m) + 1;
}
export const author = (m: ChatMessage) =>
  (m.metadata as { author?: string })?.author ?? (m.role === "user" ? "Consultant" : "Copilote");

export function metricsFor(w: Workspace) {
  const tools = (w.clarification?.tools ?? []) as Tool[];
  return compare(
    w.nodes.filter((n) => !n.is_to_be).map(toEngine),
    w.nodes.filter((n) => n.is_to_be).map(toEngine),
    {
      annualVolume: Number(w.process.annual_volume),
      reworkRatePercent: Number(w.clarification?.rework_rate_percent ?? 0),
      monthlyLicences: tools.reduce((s, t) => s + Number(t.monthly_cost || 0), 0),
    },
  );
}

const line = (n: PNode) =>
  `- ${meta(n).ref ?? n.id} « ${n.label} » [${n.action_type}/${n.color_code}] travail ${formatDuration(Number(n.cycle_time_minutes))}, attente ${formatDuration(Number(n.wait_time_minutes))}, ${n.hourly_cost} €/h, ${n.assigned_role ?? "?"}${n.is_automated ? ", automatisé" : ""}`;

export function buildContext(w: Workspace, withChat = false) {
  const m = metricsFor(w);
  const c = w.clarification;
  const parts = [
    `CLIENT : ${w.client.name} (${w.client.industry ?? "secteur n.c."})`,
    `PROCESSUS : ${w.process.title} — volume annuel ${w.process.annual_volume}`,
    `SAISIE INITIALE : ${w.process.raw_input ?? ""}`,
    c ? `ACTEURS : ${((c.actors ?? []) as Actor[]).map((a) => `${a.name} ${a.hourly_rate_loaded} €/h`).join(", ")}` : "",
    c ? `OUTILS : ${((c.tools ?? []) as Tool[]).map((t) => `${t.name}${t.is_silo ? " (silo)" : ""} ${t.monthly_cost} €/mois`).join(", ")}` : "",
    c ? `INDUCTEURS : ${((c.cost_drivers ?? []) as CostDriver[]).map((d) => `${d.driver_name} ${d.frequency ?? ""}`).join(", ")} — reprise ${c.rework_rate_percent} %` : "",
    `AS-IS :\n${w.nodes.filter((n) => !n.is_to_be).map(line).join("\n")}`,
    `TO-BE :\n${w.nodes.filter((n) => n.is_to_be).map(line).join("\n")}`,
    `MÉTRIQUES : cycle ${formatDuration(m.asIs.cycleMinutes)} → ${formatDuration(m.toBe.cycleMinutes)} ; coût unitaire ${eur(m.asIs.unitCost)} → ${eur(m.toBe.unitCost)} ; hard cash ${eur(m.hardCash)}/an ; ${Math.round(m.hoursFreed)} h libérées/an ; goulot As-Is : ${m.asIs.bottleneck?.label ?? "-"}`,
  ];
  if (withChat) {
    parts.push(
      `ÉCHANGES COPILOTE :\n${w.messages
        .map((x) => {
          const node = w.nodes.find((n) => n.id === x.node_id);
          return `#${exchangeNo(x, w.messages)} ${author(x)}${node ? ` (sur ${meta(node).ref})` : ""} : ${x.content}`;
        })
        .join("\n")}`,
    );
  }
  return parts.filter(Boolean).join("\n\n");
}
