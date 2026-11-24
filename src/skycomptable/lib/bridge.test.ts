import { describe, it, expect } from "vitest";
import { bridgeLines } from "./bridge";

const acc = { partner: "P", main: "M", vat: "V" };
const doc = { id: "1", type: "invoice", number: "FAC-1", issue_date: "2026-01-01", total_ht: 100, total_vat: 20, total_ttc: 120, partner: "X" };

describe("bridgeLines", () => {
  it("vente : 411 débit TTC, 706 et TVA collectée au crédit", () => {
    const l = bridgeLines("skyvente", doc, acc);
    expect(l.map((x) => [x.account_id, x.debit, x.credit])).toEqual([["P", 120, 0], ["M", 0, 100], ["V", 0, 20]]);
  });
  it("achat : 606 et TVA déductible au débit, 401 crédit TTC", () => {
    const l = bridgeLines("skyachat", doc, acc);
    expect(l.map((x) => [x.account_id, x.debit, x.credit])).toEqual([["P", 0, 120], ["M", 100, 0], ["V", 20, 0]]);
  });
  it("avoir client inverse le sens, même avec montants négatifs", () => {
    const l = bridgeLines("skyvente", { ...doc, type: "credit_note", total_ht: -100, total_vat: -20 }, acc);
    expect(l[0]).toMatchObject({ debit: 0, credit: 120 });
  });
});

import { paymentLines } from "./bridge";
describe("paymentLines", () => {
  const p = { id: "p", amount: 500, date: "2026-01-02", invoiceNumber: "FAC-1", partner: "X" };
  const a = { bank: "512", partner: "T" };
  it("encaissement client : 512 au débit, 411 au crédit", () => {
    const l = paymentLines("skyvente", p, a);
    expect(l[0]).toMatchObject({ account_id: "512", debit: 500, credit: 0 });
    expect(l[1]).toMatchObject({ account_id: "T", debit: 0, credit: 500 });
  });
  it("paiement fournisseur : 401 au débit, 512 au crédit", () => {
    const l = paymentLines("skyachat", p, a);
    expect(l[0]).toMatchObject({ account_id: "512", debit: 0, credit: 500 });
    expect(l[1]).toMatchObject({ account_id: "T", debit: 500, credit: 0 });
  });
});
