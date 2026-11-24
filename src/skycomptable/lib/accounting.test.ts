import { describe, expect, it } from "vitest";
import { entryTotals, trialBalance, validateEntry } from "./accounting";

describe("règles d'écriture", () => {
  it("accepte une écriture équilibrée de deux lignes", () => {
    expect(
      validateEntry([
        { account_id: "a", label: "x", debit: 120, credit: 0 },
        { account_id: "b", label: "x", debit: 0, credit: 120 },
      ]),
    ).toEqual([]);
  });
  it("refuse une écriture déséquilibrée", () => {
    const e = validateEntry([
      { account_id: "a", label: "x", debit: 100, credit: 0 },
      { account_id: "b", label: "x", debit: 0, credit: 99.99 },
    ]);
    expect(e.some((m) => m.includes("non équilibrée"))).toBe(true);
  });
  it("refuse une seule ligne", () => {
    expect(validateEntry([{ account_id: "a", label: "x", debit: 10, credit: 0 }]).length).toBeGreaterThan(0);
  });
  it("refuse débit et crédit sur la même ligne", () => {
    const e = validateEntry([
      { account_id: "a", label: "x", debit: 10, credit: 10 },
      { account_id: "b", label: "x", debit: 0, credit: 0 },
    ]);
    expect(e.some((m) => m.includes("à la fois"))).toBe(true);
  });
  it("arrondit les totaux au centime", () => {
    expect(entryTotals([
      { account_id: "a", label: "", debit: 0.1, credit: 0 },
      { account_id: "a", label: "", debit: 0.2, credit: 0 },
    ]).debit).toBe(0.3);
  });
  it("calcule la balance par compte", () => {
    const b = trialBalance([
      { account_id: "512", debit: "100", credit: "0" },
      { account_id: "512", debit: "0", credit: "30" },
    ]);
    expect(b.get("512")).toEqual({ debit: 100, credit: 30 });
  });
});

import { accountNature } from "./accounting";
describe("accountNature", () => {
  it("706000 typé revenue compte comme produit", () => expect(accountNature("706000", "revenue")).toBe("income"));
  it("606000 compte comme charge", () => expect(accountNature("606000", "asset")).toBe("expense"));
  it("411000 reste actif", () => expect(accountNature("411000", "asset")).toBe("asset"));
});
