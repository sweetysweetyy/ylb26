import { describe, expect, it } from "vitest";
import { entryTotals } from "./accounting";
import {
  buildFec, fecFileName, invoiceEntryLines, invoiceStatusAfterPayment, invoiceTotals, parseBankCsv, paymentEntryLines, vatSummary,
} from "./invoicing";

const taxes = [{ id: "t85", rate_percent: 8.5, tax_account_id: "acc44571" }];
const lines = [{ description: "Prestation", quantity: 2, unit_price: 100, account_id: "acc706", tax_rate_id: "t85" }];

describe("factures", () => {
  it("calcule HT, TVA 8,5 % et TTC", () => {
    expect(invoiceTotals(lines, taxes)).toEqual({ subtotal: 200, tax: 17, total: 217 });
  });
  it("facture client : 411 au débit, produit et TVA au crédit, équilibrée", () => {
    const l = invoiceEntryLines({ type: "customer_invoice", lines, taxes, partnerAccountId: "acc411", contactId: "c", label: "F1" });
    expect(l[0]).toMatchObject({ account_id: "acc411", debit: 217, credit: 0 });
    expect(l.find((x) => x.account_id === "acc44571")).toMatchObject({ credit: 17 });
    expect(entryTotals(l).delta).toBe(0);
  });
  it("facture fournisseur : 401 au crédit", () => {
    const l = invoiceEntryLines({ type: "supplier_bill", lines, taxes, partnerAccountId: "acc401", contactId: "c", label: "A1" });
    expect(l[0]).toMatchObject({ account_id: "acc401", debit: 0, credit: 217 });
    expect(entryTotals(l).delta).toBe(0);
  });
  it("avoir client : 411 au crédit", () => {
    const l = invoiceEntryLines({ type: "customer_credit_note", lines, taxes, partnerAccountId: "acc411", contactId: "c", label: "AV" });
    expect(l[0]).toMatchObject({ credit: 217 });
  });
});

describe("paiements", () => {
  it("encaissement client : banque au débit", () => {
    const l = paymentEntryLines({ type: "customer_invoice", amount: 100, bankAccountId: "b", partnerAccountId: "p", contactId: "c", label: "R" });
    expect(l[0]).toMatchObject({ account_id: "b", debit: 100 });
    expect(entryTotals(l).delta).toBe(0);
  });
  it("statut payée / partiellement payée", () => {
    expect(invoiceStatusAfterPayment(217, 100)).toBe("partially_paid");
    expect(invoiceStatusAfterPayment(217, 217)).toBe("paid");
  });
});

describe("relevé bancaire", () => {
  it("lit le CSV et ignore l'en-tête, identifiants stables pour éviter les doublons", () => {
    const csv = "Date;Libellé;Montant\n05/01/2026;VIR CLIENT;1 234,50\n05/01/2026;FRAIS;-3,00\n05/01/2026;FRAIS;-3,00";
    const r = parseBankCsv(csv);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ date: "2026-01-05", amount: 1234.5 });
    expect(r[1]!.external_id).not.toBe(r[2]!.external_id);
    expect(parseBankCsv(csv)[2]!.external_id).toBe(r[2]!.external_id);
  });
});

describe("FEC et TVA", () => {
  it("18 colonnes tabulées, dates AAAAMMJJ, montants à virgule", () => {
    const fec = buildFec([{ journal_code: "VT", journal_name: "Ventes", entry_number: "VT-2026-0001", entry_date: "2026-01-05",
      account_code: "411000", account_name: "Clients", label: "F1", debit: 217, credit: 0, posted_at: "2026-01-05T10:00:00Z" }]);
    const [h, row] = fec.split("\r\n");
    expect(h!.split("\t")).toHaveLength(18);
    const c = row!.split("\t");
    expect(c).toHaveLength(18);
    expect(c[3]).toBe("20260105");
    expect(c[11]).toBe("217,00");
    expect(fecFileName("123 456 789 00012", "2026-12-31")).toBe("123456789FEC20261231.txt");
  });
  it("TVA nette = collectée - déductible", () => {
    expect(vatSummary([
      { account_code: "445710", debit: 0, credit: 17 },
      { account_code: "445660", debit: 5, credit: 0 },
    ])).toEqual({ collected: 17, deductible: 5, net: 12 });
  });
});
