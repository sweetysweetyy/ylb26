import { describe, expect, it } from "vitest";
import { computeTotals, lineHT } from "./calc";

const item = (q: number, p: number, vat: number, d = 0) => ({
  id: "x", name: "a", quantity: q, unit: "u", unit_price: p, vat_rate: vat, discount: d,
});

describe("calc", () => {
  it("line discount applies", () => {
    expect(lineHT(item(2, 100, 20, 10))).toBe(180);
  });
  it("totals with mixed VAT", () => {
    const t = computeTotals([item(1, 100, 20), item(1, 50, 10)]);
    expect(t.total_ht).toBe(150);
    expect(t.total_vat).toBe(25);
    expect(t.total_ttc).toBe(175);
  });
  it("global discount and VAT exemption", () => {
    const t = computeTotals([item(1, 200, 20)], 10, true);
    expect(t.total_ht).toBe(180);
    expect(t.total_vat).toBe(0);
  });
});
