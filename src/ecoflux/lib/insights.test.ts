import { describe, expect, it } from "vitest";
import { simulate, diagnostics } from "./insights";

const input = { annualVolume: 1000, reworkRatePercent: 0, monthlyLicences: 0 };
const nodes = [
  { id: "a", label: "Saisie", cycle_time_minutes: 60, wait_time_minutes: 100, hourly_cost: 40, is_automated: false },
  { id: "b", label: "Contrôle", cycle_time_minutes: 30, wait_time_minutes: 0, hourly_cost: 40, is_automated: false },
  { id: "c", label: "Envoi", cycle_time_minutes: 10, wait_time_minutes: 0, hourly_cost: 40, is_automated: false },
];

describe("scénarios", () => {
  it("quick-wins divise l'attente par 2 sans automatiser", () => {
    const r = simulate(nodes, "quick", input);
    expect(r[0]!.wait_time_minutes).toBe(50);
    expect(r.some((n) => n.is_automated)).toBe(false);
  });
  it("équilibré automatise les 2 étapes les plus coûteuses", () => {
    const r = simulate(nodes, "balanced", input);
    expect(r.filter((n) => n.is_automated).map((n) => n.id)).toEqual(["a", "b"]);
  });
  it("full agentique automatise tout à 10 % du temps et attente / 4", () => {
    const r = simulate(nodes, "agentic", input);
    expect(r[0]!.cycle_time_minutes).toBe(6);
    expect(r[0]!.wait_time_minutes).toBe(25);
  });
});

describe("diagnostic", () => {
  it("signale un coût horaire sous 20 €/h", () => {
    const d = diagnostics([{ ...nodes[2]!, hourly_cost: 12 }], input);
    expect(d.some((x) => x.title.includes("Coût horaire bas"))).toBe(true);
  });
});
