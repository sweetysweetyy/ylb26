import { describe, expect, it } from "vitest";
import { nodeDelta, nodeSource } from "./sources";
import type { Workspace } from "./data";
import type { PNode } from "./types";

const node = (o: Partial<PNode>) => ({ id: "n", label: "Saisie", is_to_be: false, is_automated: false, cycle_time_minutes: 60, wait_time_minutes: 0, metadata: {}, ...o }) as PNode;
const ws = (nodes: PNode[], messages: unknown[] = []) => ({ nodes, messages, roundUp: null }) as unknown as Workspace;

describe("sources des décisions", () => {
  it("sans citation, échange ni règle, la source est manquante", () => {
    const n = node({});
    expect(nodeSource(ws([n]), n).kind).toBe("missing");
  });
  it("un skill appliqué devient la source", () => {
    const n = node({ metadata: { source: "Agents IA" } });
    expect(nodeSource(ws([n]), n).kind).toBe("skill");
  });
  it("un échange rattaché au nœud prime sur le skill", () => {
    const n = node({ metadata: { source: "Agents IA" } });
    expect(nodeSource(ws([n], [{ id: "m", node_id: "n", role: "user", content: "x", metadata: {} }]), n).kind).toBe("message");
  });
});

describe("delta To-Be", () => {
  it("compare la durée avec l'étape As-Is du même nom", () => {
    const a = node({ id: "a" }), b = node({ id: "b", is_to_be: true, cycle_time_minutes: 15 });
    expect(nodeDelta(ws([a, b]), b)?.label).toBe("−75 % de durée");
  });
  it("une étape automatisée dans la cible est signalée", () => {
    const a = node({ id: "a" }), b = node({ id: "b", is_to_be: true, is_automated: true });
    expect(nodeDelta(ws([a, b]), b)?.kind).toBe("automated");
  });
});

describe("explications natives des nœuds", () => {
  it("un nœud As-Is cite la description terrain", () => {
    const n = node({ is_to_be: false, metadata: { source_quote: "Sarah télécharge la pièce jointe" } });
    expect(nodeSource(ws([n]), n).kind).toBe("terrain");
  });
  it("un nœud To-Be affiche la décision d'ingénierie", () => {
    const n = node({ is_to_be: true, metadata: { explanation: "Remplace le renommage manuel." } });
    expect(nodeSource(ws([n]), n).kind).toBe("engineering");
  });
});
