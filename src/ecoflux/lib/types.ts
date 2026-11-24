import type { Database } from "@/ecoflux/types";

type T = Database["public"]["Tables"];
export type Client = T["eco_clients"]["Row"];
export type Process = T["eco_processes"]["Row"];
export type Clarification = T["eco_clarifications"]["Row"];
export type Skill = T["eco_skills"]["Row"];
export type ProcessSkill = T["eco_process_skills"]["Row"];
export type PNode = T["eco_process_nodes"]["Row"];
export type PEdge = T["eco_process_edges"]["Row"];
export type ChatMessage = T["eco_chat_messages"]["Row"];
export type RoundUp = T["eco_round_up_solutions"]["Row"];
export type ActionType = Database["public"]["Enums"]["eco_action_type"];
export type ColorCode = Database["public"]["Enums"]["eco_color_code"];

export type Actor = { name: string; role?: string; hourly_rate_loaded: number; department?: string };
export type Tool = { name: string; category?: string; monthly_cost: number; is_silo?: boolean };
export type CostDriver = { driver_name: string; unit?: string; frequency?: string };
export type NodeMeta = { ref?: string; tag?: string; display?: string; note?: string; source_quote?: string; explanation?: string };
export type Phase = { phase: number; title: string; steps?: string[] };
export type TraceAction = {
  title: string;
  node_id: string | null;
  chat_message_id: string | null;
  citation: string;
  rule?: string;
  owner?: string;
  tools?: string;
  confidence?: number;
};
