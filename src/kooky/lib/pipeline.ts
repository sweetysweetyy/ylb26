import { supabase } from "@/integrations/supabase/client";

export type LogEntry = {
  id: number;
  kind: "status" | "thinking" | "search" | "error" | "done";
  text: string;
  leadId?: string;
  at: number;
};

type StepEvent =
  | { type: "ping" }
  | { type: "status"; message: string; leadId?: string }
  | { type: "thinking"; text: string; leadId?: string }
  | { type: "search"; query: string; leadId?: string }
  | { type: "error"; message: string }
  | { type: "done"; next: boolean; remaining: number };

async function runStep(searchId: string, leadId: string | undefined, onEvent: (e: StepEvent) => void, signal: AbortSignal) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée, reconnectez-vous.");

  const res = await fetch("/api/kooky-step", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ searchId, leadId }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || `Erreur ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let result: { next: boolean } = { next: false };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev: StepEvent;
      try {
        ev = JSON.parse(line) as StepEvent;
      } catch {
        continue;
      }
      if (ev.type === "error") throw new Error(ev.message);
      if (ev.type === "done") result = { next: ev.next };
      onEvent(ev);
    }
  }
  return result;
}

/** Runs the full pipeline (discovery → analyses → Odoo) or a single lead when leadId is given. */
export async function runPipeline(
  searchId: string,
  onEvent: (e: StepEvent) => void,
  signal: AbortSignal,
  leadId?: string,
) {
  let guard = 0;
  let next = true;
  while (next && !signal.aborted && guard++ < 60) {
    const r = await runStep(searchId, leadId, onEvent, signal);
    next = r.next && !leadId;
  }
}
