import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listKpiEvents } from "@/pascal/lib/skills.functions";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pascal/kpi")({ component: KpiPage });

function KpiPage() {
  const q = useQuery({ queryKey: ["kpi-events"], queryFn: () => listKpiEvents() });
  const events = q.data ?? [];
  const byEvent: Record<string, number> = {};
  for (const e of events) byEvent[e.event] = (byEvent[e.event] ?? 0) + 1;
  return (
    <div className="space-y-6 max-w-6xl">
      <header><h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><BarChart3 className="size-7" /> KPI avancés</h1><p className="text-sm text-muted-foreground">Traçabilité totale de chaque action (30 derniers jours).</p></header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(byEvent).map(([k, v]) => (<div key={k} className="bento p-4 anim-in"><div className="text-xs text-muted-foreground font-mono">{k}</div><div className="text-3xl font-mono holo-text mt-2">{v}</div></div>))}</div>
      <div className="bento p-5"><h2 className="font-display text-xl mb-3">Journal détaillé</h2><ul className="space-y-1 max-h-[600px] overflow-y-auto font-mono text-xs">{events.slice(0, 200).map((e: any) => (<li key={e.id} className="surface-2 p-2 flex gap-3"><span className="text-muted-foreground w-40 shrink-0">{new Date(e.created_at).toLocaleString("fr-FR")}</span><span className="text-primary w-32 shrink-0">{e.event}</span><span className="truncate">{JSON.stringify(e.payload)}</span></li>))}{events.length === 0 && <li className="text-muted-foreground">Aucun événement encore.</li>}</ul></div>
    </div>
  );
}