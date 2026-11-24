import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { eco } from "@/ecoflux/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { wsKey, type Workspace } from "@/ecoflux/lib/data";
import type { LabEcosystem } from "@/ecoflux/lib/ecosystem";
import { economicScenario, mergeOverrides, metricEvidence, nodeRef } from "@/ecoflux/lib/economics";
import { emptyFrame, frameOverrides, hourlyRate, rateFormula, reliability, annualVolume, implementationCost, type RealFrame as Frame } from "@/ecoflux/lib/real-frame";

const box = "mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground outline-none focus:border-eco-violet";
const fr = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

export function RealFrame({ w }: { w: Workspace }) {
  const ecosystem = (w.process as unknown as { lab_ecosystem?: LabEcosystem | null }).lab_ecosystem ?? null;
  const [f, setF] = useState<Frame>({ ...emptyFrame(), ...(ecosystem?.real_frame ?? {}) });
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const set = <K extends keyof Frame>(k: K, v: Frame[K]) => setF((x) => ({ ...x, [k]: v }));
  const n = (k: keyof Frame) => ({ type: "number", min: 0, value: (f[k] as number) || "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never), className: box });
  const src = (k: keyof Frame) => <input aria-label="Pièce justificative" placeholder="Pièce justificative (facultatif)" value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} className={`${box} text-xs`} />;

  const scenario = economicScenario(w, ecosystem);
  const items = [...scenario.parameters.map((p) => p.evidence), ...w.nodes.flatMap((node) => (["cycle_time_minutes", "wait_time_minutes", "hourly_cost"] as const).map((field) => metricEvidence(node, field, ecosystem)))];
  const score = reliability(items);

  async function save() {
    setSaving(true);
    try {
      const humanRefs = w.nodes.filter((x) => !x.is_automated).map(nodeRef);
      const { params, metrics } = frameOverrides(f, scenario.p.monthly_licences_before, humanRefs);
      const base: LabEcosystem = ecosystem ?? { generated_at: new Date().toISOString(), summary: "", assignments: [], flows: [], phases: [] };
      const next: LabEcosystem = { ...base, real_frame: f, parameter_overrides: mergeOverrides(base.parameter_overrides ?? [], params), overrides: mergeOverrides(base.overrides ?? [], metrics) };
      const update: Record<string, unknown> = { lab_ecosystem: next };
      if (f.volume > 0) update.annual_volume = annualVolume(f);
      const { error } = await (eco(supabase).from("eco_processes") as unknown as { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> } }).update(update).eq("id", w.process.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: wsKey(w.process.id) });
      toast.success("Données réelles enregistrées");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  }

  return <section className="space-y-4 rounded-xl border border-border p-3">
    <div>
      <h3 className="text-sm font-medium">Cadre économique réel</h3>
      <p className="text-[11px] text-muted-foreground">Ce que vous renseignez ici remplace toute estimation. Les chiffres non renseignés restent « à confirmer ».</p>
      <div className="mt-2 flex items-center gap-2 text-xs"><ShieldCheck className={score.percent === 100 ? "size-4 text-eco-cyan" : "size-4 text-eco-amber"} /><span>{score.percent} % vérifié · {score.total - score.verified} chiffre(s) à confirmer</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-eco-cyan" style={{ width: `${score.percent}%` }} /></div>
    </div>

    <label className="block text-xs text-muted-foreground">1. Combien de dossiers traitez-vous ?
      <div className="flex gap-2"><input aria-label="Nombre de dossiers" {...n("volume")} /><select aria-label="Période" value={f.volumePeriod} onChange={(e) => set("volumePeriod", e.target.value as Frame["volumePeriod"])} className={box}><option value="month">par mois</option><option value="year">par an</option></select></div>
      {f.volume > 0 && <span className="text-[11px]">= {fr(annualVolume(f))} dossiers / an</span>}{src("volumeSource")}</label>

    <label className="block text-xs text-muted-foreground">2. Salaire brut mensuel de la personne qui fait ce travail (€)
      <input aria-label="Salaire brut mensuel" {...n("grossSalary")} />
      <div className="flex gap-2"><span className="flex-1">Coef. charges<input aria-label="Coefficient de charges" type="number" step="0.01" value={f.charges} onChange={(e) => set("charges", Number(e.target.value))} className={box} /></span><span className="flex-1">Heures/mois<input aria-label="Heures par mois" type="number" step="0.01" value={f.monthlyHours} onChange={(e) => set("monthlyHours", Number(e.target.value))} className={box} /></span></div>
      {f.grossSalary > 0 && <span className="font-mono text-[11px] text-eco-cyan">{rateFormula(f)}</span>}{src("salarySource")}</label>

    <label className="block text-xs text-muted-foreground">3. Sur 100 dossiers, combien bloquent ou doivent être corrigés ?
      <input aria-label="Dossiers à problème sur 100" {...n("incidentsPer100")} max={100} />{src("incidentsSource")}</label>

    <label className="block text-xs text-muted-foreground">4. Abonnements logiciels qui seront résiliés (€/mois)
      <input aria-label="Abonnements résiliés" {...n("licencesCancelled")} />{src("licencesSource")}</label>

    <label className="block text-xs text-muted-foreground">5. Que devient le temps gagné ?
      <select aria-label="Devenir du temps gagné" value={f.timeUse} onChange={(e) => set("timeUse", e.target.value as Frame["timeUse"])} className={box}>
        <option value="absorption">L’équipe souffle (0 € de cash, heures affichées)</option>
        <option value="overtime">On supprime heures supp / intérim</option>
        <option value="commercial">Temps réinvesti pour vendre / produire</option>
      </select>
      {f.timeUse !== "absorption" && <><span>{f.timeUse === "overtime" ? "Coût horaire des heures supp ou de l’intérim (€/h)" : "Votre taux horaire facturé (€/h)"}</span><input aria-label="Valeur de l'heure gagnée" {...n("timeRate")} /></>}</label>

    <label className="block text-xs text-muted-foreground">6. Coût réel de la mise en place
      <select aria-label="Type d'investissement" value={f.investment} onChange={(e) => set("investment", e.target.value as Frame["investment"])} className={box}>
        <option value="lab">Apps internes du Lab (0 € d’achat)</option><option value="quote">Devis prestataire / outil</option><option value="internal">Jours de travail internes</option>
      </select>
      {f.investment === "quote" && <input aria-label="Montant du devis" placeholder="Montant du devis (€)" {...n("quoteAmount")} />}
      {f.investment === "internal" && <><input aria-label="Jours internes" placeholder="Nombre de jours" {...n("internalDays")} /><span className="text-[11px]">{fr(f.internalDays)} j × 7 h × {fr(hourlyRate(f))} €/h = {fr(implementationCost(f))} €</span></>}
      {f.investment !== "lab" && src("investmentSource")}</label>

    <Button className="w-full text-xs" disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer les données réelles"}</Button>
  </section>;
}
