import { exchangeNo, author } from "./context";
import { meta, type Workspace } from "./data";
import type { PNode, TraceAction } from "./types";

export type SourceKind = "citation" | "message" | "skill" | "terrain" | "engineering" | "note" | "missing";
export type NodeSource = { kind: SourceKind; label: string; detail: string; messageId: string | null };

/** Source précise justifiant un nœud, par ordre de fiabilité. Ne jamais inventer : sinon "missing". */
export function nodeSource(w: Workspace, n: PNode): NodeSource {
  const actions = (w.roundUp?.decisions_traceability ?? []) as TraceAction[];
  const a = actions.find((x) => x.node_id === n.id && x.chat_message_id && x.citation);
  const am = a && w.messages.find((m) => m.id === a.chat_message_id);
  if (a && am) return { kind: "citation", label: `${author(am)} · échange ${exchangeNo(am, w.messages)}`, detail: `« ${a.citation} »${a.rule ? ` → ${a.rule}` : ""}`, messageId: am.id };
  const m = [...w.messages].reverse().find((x) => x.node_id === n.id);
  if (m) return { kind: "message", label: `${author(m)} · échange ${exchangeNo(m, w.messages)}`, detail: m.content.length > 180 ? `${m.content.slice(0, 180)}…` : m.content, messageId: m.id };
  const md = meta(n) as { source?: string; note?: string; source_quote?: string; explanation?: string };
  if (!n.is_to_be && md.source_quote?.trim()) return { kind: "terrain", label: "Description terrain", detail: `« ${md.source_quote} »`, messageId: null };
  if (n.is_to_be && md.explanation?.trim()) return { kind: "engineering", label: "Décision d'ingénierie", detail: md.explanation, messageId: null };
  if (md.source) return { kind: "skill", label: "Skill appliqué", detail: md.source, messageId: null };
  if (md.note?.trim()) return { kind: "note", label: "Note du consultant", detail: md.note, messageId: null };
  return { kind: "missing", label: "Source manquante", detail: "Aucune citation, échange ou règle ne justifie encore ce nœud.", messageId: null };
}

export type Delta = { kind: "automated" | "new" | "faster" | "unchanged"; label: string };

const norm = (s: string) => s.trim().toLowerCase();

/** Ce qu'un nœud To-Be change par rapport à l'As-Is (rapprochement par libellé). */
export function nodeDelta(w: Workspace, n: PNode): Delta | null {
  if (!n.is_to_be) return null;
  const twin = w.nodes.find((x) => !x.is_to_be && norm(x.label) === norm(n.label));
  if (n.is_automated && (!twin || !twin.is_automated)) return { kind: "automated", label: "Automatisé" };
  if (!twin) return { kind: "new", label: "Nouveau" };
  const before = Number(twin.cycle_time_minutes) + Number(twin.wait_time_minutes);
  const after = Number(n.cycle_time_minutes) + Number(n.wait_time_minutes);
  if (before > 0 && after < before) return { kind: "faster", label: `−${Math.round((1 - after / before) * 100)} % de durée` };
  return { kind: "unchanged", label: "Inchangé" };
}

export function toBeSummary(w: Workspace) {
  const tb = w.nodes.filter((n) => n.is_to_be);
  const ds = tb.map((n) => nodeDelta(w, n));
  const missing = tb.filter((n) => nodeSource(w, n).kind === "missing").length;
  return {
    automated: ds.filter((d) => d?.kind === "automated").length,
    created: ds.filter((d) => d?.kind === "new").length,
    faster: ds.filter((d) => d?.kind === "faster").length,
    sourced: tb.length - missing,
    total: tb.length,
  };
}
