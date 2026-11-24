import { describe, expect, it, vi } from "vitest";

vi.mock("./google-tools.server", () => ({ buildAllTools: () => ({}) }));

import { buildLabAgentTools, LAB_AUTOMATION_APPS } from "./assistant-apps.server";
import { moreActions } from "./assistant-more-actions.server";

const workflows = [
  ["facturodoo", "importer_facture"],
  ["prospect", "ajouter_entreprise"],
  ["kooky", "creer_lead"],
  ["nexusjob", "ajouter_offre"],
  ["dyap", "creer_presentation"],
  ["studioproduit", "creer_shoot"],
  ["pageweaver", "creer_projet"],
  ["odooweb", "creer_site"],
  ["businessplan", "creer_plan"],
  ["chytect", "creer_projet"],
  ["ecoflux", "creer_processus"],
  ["tep", "creer_postit"],
] as const;

describe("Shared workflow registration", () => {
  it.each(workflows)("exposes %s / %s to Smart Teams", (app, action) => {
    expect(buildLabAgentTools([app]).map((tool) => tool.action)).toContain(action);
  });

  it.each(workflows)("keeps %s available to MyMackenzy", (app) => {
    expect(LAB_AUTOMATION_APPS).toContain(app);
  });

  it.each(workflows)("preserves existing %s actions", (app) => {
    const registered = buildLabAgentTools([app]).map((tool) => tool.action);
    for (const action of Object.keys(moreActions[app] ?? {})) {
      expect(registered).toContain(action);
    }
  });

  it("does not expose apps outside the Smart Teams selection", () => {
    expect(buildLabAgentTools([])).toEqual([]);
    expect(buildLabAgentTools(["facturodoo"]).every((tool) => tool.app === "facturodoo")).toBe(true);
  });
});