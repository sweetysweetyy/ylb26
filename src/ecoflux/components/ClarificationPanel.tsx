import { eco } from "@/ecoflux/lib/db";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clarifyProcess } from "@/ecoflux/lib/ai.functions";
import { writeClarification, wsKey, type Workspace } from "@/ecoflux/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { RealFrame } from "@/ecoflux/components/RealFrame";
import type { Actor, Tool, CostDriver } from "@/ecoflux/lib/types";

export function ClarificationPanel({ w, onClose }: { w: Workspace; onClose: () => void }) {
  const [raw, setRaw] = useState(w.process.raw_input ?? "");
  const [pending, setPending] = useState(false);
  const clarify = useServerFn(clarifyProcess);
  const qc = useQueryClient();
  async function run() {
    if (w.nodes.length && !window.confirm("Cette requalification remplacera les étapes et connexions actuelles. Continuer ?")) return;
    setPending(true);
    try {
      const result = await clarify({ data: { title: w.process.title, client: w.client.name, rawInput: raw } });
      const { error } = await eco(supabase).from("eco_processes").update({ raw_input: raw }).eq("id", w.process.id);
      if (error) throw error;
      await writeClarification(w.process.id, result);
      await qc.invalidateQueries({ queryKey: wsKey(w.process.id) });
      toast.success("Clarification et flux actualisés");
    } catch (e) { toast.error(e instanceof Error ? e.message : "La clarification a échoué."); }
    finally { setPending(false); }
  }
  const actors = (w.clarification?.actors ?? []) as Actor[];
  const tools = (w.clarification?.tools ?? []) as Tool[];
  const drivers = (w.clarification?.cost_drivers ?? []) as CostDriver[];
  return <aside className="clarification-panel flex min-h-0 flex-col border-r border-border bg-card/50">
    <div className="flex items-center justify-between p-4"><h2 className="section-label">ÉTAPE 1 · CLARIFICATION</h2><Button size="icon" variant="ghost" aria-label="Replier la clarification" onClick={onClose}><ChevronLeft /></Button></div>
    <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
      <label className="block space-y-2 text-xs text-muted-foreground">Description terrain<textarea aria-label="Description terrain" value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} className="w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground outline-none focus:border-eco-violet" /></label>
      <Button variant="outline" className="eco-holo w-full text-xs" disabled={pending || raw.trim().length < 10} onClick={run}>{pending ? <Loader2 className="animate-spin" /> : <Sparkles />} {pending ? "Requalification…" : "Requalifier le processus"}</Button>
      <RealFrame key={String(w.process.updated_at ?? "")} w={w} />
      <div><h3 className="mb-3 text-sm font-medium">Acteurs & coûts chargés</h3>{actors.map((a, i) => <div key={i} className="flex justify-between gap-3 border-b border-border py-2 text-xs"><span>{a.name}<span className="block text-muted-foreground">{a.role}</span></span><span className="shrink-0 font-mono text-eco-cyan">{a.hourly_rate_loaded} €/h</span></div>)}</div>
      <div><h3 className="mb-3 text-sm font-medium">Outils & sources</h3>{tools.map((t, i) => <div key={i} className="flex justify-between gap-2 py-1 text-xs"><span>{t.name}</span><span className="text-muted-foreground">{t.monthly_cost} €/mois</span></div>)}</div>
      <div><h3 className="mb-2 text-sm font-medium">Inducteurs de coûts</h3>{drivers.map((d, i) => <p key={i} className="py-1 text-xs text-muted-foreground">{d.driver_name} · {d.frequency}</p>)}</div>
      <label className="block text-xs text-muted-foreground">Volume annuel<input aria-label="Volume annuel" type="number" min="1" defaultValue={w.process.annual_volume} className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-foreground" onBlur={async (e) => { const v = Number(e.target.value); if (v <= 0) return; const { error } = await eco(supabase).from("eco_processes").update({ annual_volume: v }).eq("id", w.process.id); if (error) toast.error(error.message); else await qc.invalidateQueries({ queryKey: wsKey(w.process.id) }); }} /></label>
      <p className="text-xs text-eco-amber">Reprises : {w.clarification?.rework_rate_percent ?? 0} %</p>
    </div>
  </aside>;
}