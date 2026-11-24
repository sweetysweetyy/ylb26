import { eco } from "@/ecoflux/lib/db";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { copilotReply } from "@/ecoflux/lib/ai.functions";
import { buildContext } from "@/ecoflux/lib/context";
import { meta, updateNode, wsKey, type Workspace } from "@/ecoflux/lib/data";
import type { PNode } from "@/ecoflux/lib/types";

export function useCopilot(w: Workspace) {
  const qc = useQueryClient();
  const ask = useServerFn(copilotReply);
  const [pending, setPending] = useState(false);

  const send = async (text: string, nodeId: string | null) => {
    const content = text.trim();
    if (!content || pending) return;
    setPending(true);
    const nextNo = w.messages.length + 1 + 0;
    const exchangeBase = Math.max(0, ...w.messages.map((m) => Number((m.metadata as { exchange?: number })?.exchange ?? 0)), w.messages.length);
    try {
      const { data: um, error } = await eco(supabase)
        .from("eco_chat_messages")
        .insert({ process_id: w.process.id, node_id: nodeId, role: "user", content, metadata: { author: "Consultant", exchange: exchangeBase + 1 } })
        .select()
        .single();
      if (error) throw error;
      qc.setQueryData<Workspace>(wsKey(w.process.id), (x) => (x ? { ...x, messages: [...x.messages, um] } : x));
      const node = w.nodes.find((n) => n.id === nodeId);
      const history = w.messages.filter((m) => (nodeId ? m.node_id === nodeId : true)).slice(-30).map((m) => ({ role: m.role, content: m.content }));
      const r = await ask({ data: { context: buildContext(w, false), history, message: content, focusRef: node ? meta(node).ref ?? null : null } });
      const applied: string[] = [];
      for (const u of r.updates) {
        const target = w.nodes.find((n) => n.is_to_be && meta(n).ref === u.ref);
        if (!target) continue;
        const patch: Partial<PNode> = {};
        if (u.label) patch.label = u.label;
        if (typeof u.cycle_time_minutes === "number") patch.cycle_time_minutes = u.cycle_time_minutes;
        if (typeof u.wait_time_minutes === "number") patch.wait_time_minutes = u.wait_time_minutes;
        if (typeof u.hourly_cost === "number") patch.hourly_cost = u.hourly_cost;
        if (typeof u.is_automated === "boolean") patch.is_automated = u.is_automated;
        if (u.color_code) patch.color_code = u.color_code;
        if (u.action_type) patch.action_type = u.action_type;
        if (u.assigned_role) patch.assigned_role = u.assigned_role;
        if (Object.keys(patch).length) {
          await updateNode(target.id, patch);
          applied.push(u.ref);
        }
      }
      const { error: e2 } = await eco(supabase).from("eco_chat_messages").insert({
        process_id: w.process.id, node_id: nodeId, role: "assistant", content: r.reply || "…",
        metadata: { exchange: exchangeBase + 2, applied },
      });
      if (e2) throw e2;
      if (applied.length) toast.success(`Canvas To-Be mis à jour : ${applied.join(", ")}`);
      void nextNo;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le copilote n'a pas pu répondre.");
    } finally {
      setPending(false);
      await qc.invalidateQueries({ queryKey: wsKey(w.process.id) });
    }
  };
  return { send, pending };
}
