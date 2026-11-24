import { describe, expect, it } from "vitest";
import { emptyFrame, hourlyRate, annualVolume, frameOverrides, implementationCost, reliability } from "./real-frame";

describe("cadre économique réel", () => {
  it("2 600 € brut → 24,34 €/h chargé", () => { expect(hourlyRate({ ...emptyFrame(), grossSalary: 2600 })).toBeCloseTo(24.34, 2); });
  it("80 dossiers/mois → 960/an", () => { expect(annualVolume({ ...emptyFrame(), volume: 80 })).toBe(960); });
  it("temps absorbé → 0 € par heure libérée", () => {
    const { params } = frameOverrides({ ...emptyFrame(), timeRate: 50 }, 0, []);
    expect(params.find((p) => p.field === "revenue_per_freed_hour")?.value).toBe(0);
  });
  it("apps du Lab → investissement 0 €, devis → montant du devis", () => {
    expect(implementationCost(emptyFrame())).toBe(0);
    expect(implementationCost({ ...emptyFrame(), investment: "quote", quoteAmount: 2500 })).toBe(2500);
  });
  it("licences résiliées réduisent les licences cibles", () => {
    const { params } = frameOverrides({ ...emptyFrame(), licencesCancelled: 350 }, 500, []);
    expect(params.find((p) => p.field === "monthly_licences_after")?.value).toBe(150);
  });
  it("jauge : 1 déclarée sur 2 = 50 %", () => {
    expect(reliability([{ kind: "declared", quote: "x", reason: "" }, { kind: "estimated", quote: "", reason: "" }]).percent).toBe(50);
  });
});
