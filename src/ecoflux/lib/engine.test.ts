import { describe, expect, it } from "vitest";
import { compare, flowMetrics } from "./engine";

const n = (o: Partial<Parameters<typeof flowMetrics>[0][number]>) => ({
  id: "x", label: "x", cycle_time_minutes: 0, wait_time_minutes: 0, hourly_cost: 0, is_automated: false, ...o,
});

describe("moteur TDABC", () => {
  it("coût unitaire = temps × taux + risque + latence + licences proratisées", () => {
    const m = flowMetrics([n({ cycle_time_minutes: 60, hourly_cost: 40, wait_time_minutes: 60 })], {
      annualVolume: 1200, reworkRatePercent: 10, monthlyLicences: 100, latencyCostPerHour: 1,
    });
    // 40 + 4 + 1 + (100*12/1200 = 1)
    expect(m.unitCost).toBeCloseTo(46);
  });

  it("payback = coût de mise en place / gain journalier", () => {
    const r = compare(
      [n({ cycle_time_minutes: 60, hourly_cost: 50 })],
      [n({ cycle_time_minutes: 0, is_automated: true })],
      { annualVolume: 365, reworkRatePercent: 0, monthlyLicences: 0, revenuePerFreedHour: 60 },
    );
    expect(r.hoursFreed).toBe(365);
    expect(r.netGain).toBe(365 * 60);
    expect(r.paybackDays).toBe(Math.ceil(6000 / 60));
  });
});
