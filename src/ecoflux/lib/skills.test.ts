import { describe, expect, it } from "vitest";
import { impact, isOpportunity } from "./skills";
import type { PNode } from "./types";

const node = (p: Partial<PNode>) => ({ label: "Étape", is_automated: false, cycle_time_minutes: 20, wait_time_minutes: 0, hourly_cost: 60, ...p }) as PNode;

describe("skills", () => {
  it("flags a 60 min wait as a flow opportunity", () => {
    expect(isOpportunity("flow", node({ wait_time_minutes: 60 }))).toBe(true);
    expect(isOpportunity("flow", node({ wait_time_minutes: 10 }))).toBe(false);
  });
  it("never flags automated nodes", () => {
    expect(isOpportunity("data", node({ is_automated: true, wait_time_minutes: 90 }))).toBe(false);
  });
  it("computes minutes and euros saved", () => {
    const r = impact(node({ wait_time_minutes: 30 }), { cycle_time_minutes: 1, hourly_cost: 4, wait_time_minutes: 0 });
    expect(r.minutes).toBe(49);
    expect(r.euros).toBeCloseTo((20 * 60 - 4) / 60);
  });
});
