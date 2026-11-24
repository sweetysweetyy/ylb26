import { eco } from "@/ecoflux/lib/db";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClarifyResult, ClarifyStep } from "./ai.functions";
import type { ChatMessage, Clarification, Client, NodeMeta, PEdge, PNode, Process, ProcessSkill, RoundUp, Skill } from "./types";

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export type Dossier = Client & { processes: Process[] };
export const dossiersQuery = queryOptions({
  queryKey: ["dossiers"],
  queryFn: async () => {
    const clients = check(await eco(supabase).from("eco_clients").select("*").order("created_at", { ascending: false }));
    const processes = check(await eco(supabase).from("eco_processes").select("*").order("updated_at", { ascending: false }));
    return clients.map((c) => ({ ...c, processes: processes.filter((p) => p.client_id === c.id) })) as Dossier[];
  },
});

export type Workspace = {
  process: Process;
  client: Client;
  clarification: Clarification | null;
  skills: Skill[];
  processSkills: ProcessSkill[];
  nodes: PNode[];
  edges: PEdge[];
  messages: ChatMessage[];
  roundUp: RoundUp | null;
};
export const wsKey = (id: string) => ["workspace", id] as const;
export const workspaceQuery = (id: string) =>
  queryOptions({
    queryKey: wsKey(id),
    queryFn: async (): Promise<Workspace> => {
      const process = check(await eco(supabase).from("eco_processes").select("*").eq("id", id).maybeSingle()) as Process | null;
      if (!process) throw new Error("Processus introuvable");
      const [client, clar, skills, ps, nodes, edges, msgs, ru] = await Promise.all([
        eco(supabase).from("eco_clients").select("*").eq("id", process.client_id).single(),
        eco(supabase).from("eco_clarifications").select("*").eq("process_id", id).maybeSingle(),
        eco(supabase).from("eco_skills").select("*").order("created_at"),
        eco(supabase).from("eco_process_skills").select("*").eq("process_id", id),
        eco(supabase).from("eco_process_nodes").select("*").eq("process_id", id).order("created_at"),
        eco(supabase).from("eco_process_edges").select("*").eq("process_id", id),
        eco(supabase).from("eco_chat_messages").select("*").eq("process_id", id).order("created_at"),
        eco(supabase).from("eco_round_up_solutions").select("*").eq("process_id", id).order("created_at", { ascending: false }).limit(1),
      ]);
      return {
        process,
        client: check(client),
        clarification: check(clar),
        skills: check(skills),
        processSkills: check(ps),
        nodes: check(nodes),
        edges: check(edges),
        messages: check(msgs),
        roundUp: check(ru)[0] ?? null,
      };
    },
  });

export const meta = (n: PNode) => (n.metadata ?? {}) as NodeMeta;

export function patchWs(qc: QueryClient, id: string, fn: (w: Workspace) => Workspace) {
  qc.setQueryData<Workspace>(wsKey(id), (w) => (w ? fn(w) : w));
}

export async function updateNode(id: string, patch: Partial<PNode>) {
  check(await eco(supabase).from("eco_process_nodes").update({ ...patch, updated_at: new Date().toISOString() } as never).eq("id", id).select().single());
}

export function layout(i: number) {
  const perRow = 4;
  const row = Math.floor(i / perRow);
  const col = i % perRow;
  const x = 40 + (row % 2 === 0 ? col : perRow - 1 - col) * 220;
  return { x, y: 80 + row * 170 };
}

/** Écrit la clarification IA + les deux flux sur un processus. */
export async function writeClarification(processId: string, r: ClarifyResult) {
  check(await eco(supabase).from("eco_process_nodes").delete().eq("process_id", processId).select());
  check(await eco(supabase).from("eco_clarifications").delete().eq("process_id", processId).select());
  check(await eco(supabase).from("eco_clarifications").insert({
    process_id: processId, actors: r.actors, tools: r.tools, cost_drivers: r.cost_drivers, rework_rate_percent: r.rework_rate_percent,
  }).select());
  const insertFlow = async (steps: ClarifyStep[], toBe: boolean) => {
    const rows = steps.map((s, i) => {
      const p = layout(i);
      return {
        process_id: processId, is_to_be: toBe, label: s.label, action_type: s.action_type, color_code: s.color_code,
        cycle_time_minutes: s.cycle_time_minutes, wait_time_minutes: s.wait_time_minutes ?? 0, hourly_cost: s.hourly_cost,
        assigned_role: s.assigned_role ?? null, is_automated: s.is_automated, position_x: p.x, position_y: p.y,
        metadata: { ref: `${toBe ? "N" : "A"}${i}`, tag: s.tag ?? "", source_quote: s.source_quote ?? "", explanation: s.explanation ?? "" },
      };
    });
    const ins = check(await eco(supabase).from("eco_process_nodes").insert(rows).select());
    const sorted = rows.map((r) => ins.find((n) => (n.metadata as NodeMeta).ref === r.metadata.ref)!);
    const edges = sorted.slice(1).map((n, i) => ({ process_id: processId, source_node_id: sorted[i]!.id, target_node_id: n.id, is_to_be: toBe }));
    if (edges.length) check(await eco(supabase).from("eco_process_edges").insert(edges).select());
  };
  await insertFlow(r.as_is, false);
  await insertFlow(r.to_be, true);
  const skills = check(await eco(supabase).from("eco_skills").select("id"));
  await eco(supabase).from("eco_process_skills").upsert(skills.map((s) => ({ process_id: processId, skill_id: s.id, is_active: true })));
  check(await eco(supabase).from("eco_processes").update({ annual_volume: r.annual_volume || 1200, status: "reengineering", updated_at: new Date().toISOString() }).eq("id", processId).select());
}
