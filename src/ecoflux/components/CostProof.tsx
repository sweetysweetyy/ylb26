import { BadgeCheck, TriangleAlert } from "lucide-react";
import type { PNode } from "@/ecoflux/lib/types";
import type { Evidence, LabEcosystem } from "@/ecoflux/lib/ecosystem";
import { costBreakdown, metricEvidence, metricLabel, metricUnit, precise } from "@/ecoflux/lib/economics";

export function EvidenceBadge({ e }: { e: Evidence }) {
  const ok = e.kind === "declared";
  return <span title={e.reason} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${ok ? "border-eco-eco-emerald/50 text-eco-emerald" : "border-eco-eco-amber/50 text-eco-amber"}`}>
    {ok ? <BadgeCheck className="size-3" /> : <TriangleAlert className="size-3" />}{ok ? "Source terrain vérifiée" : "Hypothèse d’ingénierie à valider"}
  </span>;
}

/** Fiche de calcul : formule développée + niveau de preuve de chaque chiffre. */
export function CostProof({ node, eco, reworkRatePercent, latencyCostPerHour }: { node: PNode; eco: LabEcosystem | null; reworkRatePercent: number; latencyCostPerHour: number }) {
  const c = costBreakdown(node, reworkRatePercent, latencyCostPerHour);
  const fields = ["cycle_time_minutes", "wait_time_minutes", "hourly_cost"] as const;
  return <div className="space-y-1.5 rounded-lg border border-border p-2.5 text-[11px]">
    <div className="font-mono text-[10px] text-muted-foreground">Temps actif × Taux horaire + Latence = Coût unitaire</div>
    {c.lines.map((l) => <div key={l} className="font-mono">{l}</div>)}
    <div className="font-mono font-semibold text-eco-cyan">{c.formula}</div>
    <ul className="space-y-1 pt-1">{fields.map((f) => { const e = metricEvidence(node, f, eco); return <li key={f} className="flex flex-wrap items-center gap-1.5">
      <span>{metricLabel[f]} : <b>{precise(Number(node[f]))} {metricUnit[f]}</b></span><EvidenceBadge e={e} />
      {e.kind === "declared" && e.quote && <span className="italic text-foreground/80">« {e.quote} »</span>}
    </li>; })}</ul>
    <p className="text-[10px] text-muted-foreground">Coût d’attente : {precise(latencyCostPerHour)} €/h (convention à confirmer) · taux de reprise : {precise(reworkRatePercent)} %.</p>
  </div>;
}
