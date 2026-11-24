import { describe, expect, it } from "vitest";
import { activationShare, quickWins, readiness, type Assignment } from "./ecosystem";

const a = (p: Partial<Assignment>): Assignment => ({ node_ref: "N1", app_key: "crm", reason: "", gain: "", requires: [], effort: "faible", impact: "fort", ...p });

describe("écosystème Laboratoire", () => {
  it("une app Odoo sans connexion Odoo n'est pas prête", () => {
    expect(readiness(a({ requires: ["odoo"] }), { odoo: false, google: true }).ready).toBe(false);
    expect(readiness(a({ requires: ["odoo"] }), { odoo: true, google: false }).ready).toBe(true);
  });
  it("une app à créer n'est jamais prête", () => {
    expect(readiness(a({ app_key: null }), { odoo: true, google: true }).ready).toBe(false);
  });
  it("le gain partiel est pondéré par les minutes des étapes couvertes", () => {
    const list = [a({ node_ref: "N1", app_key: "crm" }), a({ node_ref: "N2", app_key: "skyvente" })];
    const nodes = [{ ref: "N1", minutes: 30 }, { ref: "N2", minutes: 90 }];
    expect(activationShare(list, nodes, new Set(["crm"]))).toBe(0.25);
    expect(activationShare(list, nodes, new Set())).toBe(0);
  });
  it("les quick wins excluent l'effort élevé et les prérequis manquants", () => {
    const list = [a({ node_ref: "N1", effort: "élevé" }), a({ node_ref: "N2", requires: ["google"] }), a({ node_ref: "N3" })];
    expect(quickWins(list, { odoo: true, google: false }).map((x) => x.node_ref)).toEqual(["N3"]);
  });
});

import { costBreakdown, validateEvidence } from "./economics";
describe("fiches de calcul vérifiables", () => {
  it("45 min à 42 €/h + 120 min d'attente à 5 €/h = 41,50 €", () => {
    const c = costBreakdown({ cycle_time_minutes: 45, wait_time_minutes: 120, hourly_cost: 42, is_automated: true }, 0, 5);
    expect(c.total).toBeCloseTo(41.5);
  });
  it("une citation absente des propos du client devient une hypothèse", () => {
    expect(validateEvidence({ kind: "declared", quote: "45 min", reason: "" }, ["cela prend une heure"]).kind).toBe("estimated");
    expect(validateEvidence({ kind: "declared", quote: "45 min", reason: "" }, ["ça prend 45 min"]).kind).toBe("declared");
  });
});
