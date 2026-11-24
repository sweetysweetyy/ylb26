import { describe, expect, it } from "vitest";
import { invoiceLegalMentions, issuerName, missingCompanyFields, numberingGaps } from "./compliance";
import { DEFAULT_SETTINGS } from "./settings";

const co = { ...DEFAULT_SETTINGS.company };

describe("conformité française", () => {
  it("détecte un trou dans la numérotation des factures", () => {
    expect(numberingGaps(["FAC-2026-0001", "FAC-2026-0003"])).toEqual(["FAC-2026-0002"]);
  });
  it("une séquence continue n'a aucun trou", () => {
    expect(numberingGaps(["FAC-2026-0001", "FAC-2026-0002", "FAC-2027-0001"])).toEqual([]);
  });
  it("ajoute la mention EI pour un entrepreneur individuel", () => {
    expect(issuerName({ name: "Jean Dupont", is_ei: true })).toBe("Jean Dupont EI");
  });
  it("mentionne l'indemnité de 40 € sur chaque facture", () => {
    expect(invoiceLegalMentions(co).some((l) => l.includes("40 €"))).toBe(true);
  });
  it("mentionne l'art. 293 B en franchise de TVA", () => {
    expect(invoiceLegalMentions({ ...co, vat_exempt: true })[0]).toBe("TVA non applicable, art. 293 B du CGI.");
  });
  it("refuse un délai de paiement supérieur à 60 jours", () => {
    expect(missingCompanyFields({ ...co, payment_terms_days: 90 })).toContain("Délai de paiement ≤ 60 jours");
  });
});
