import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp, Target, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/pascal/simulator")({ component: SimulatorPage });

function SimulatorPage() {
  const [leadsPerMonth, setLeads] = useState(300);
  const [openRate, setOpen] = useState(55);
  const [replyRate, setReply] = useState(18);
  const [meetingRate, setMeeting] = useState(35);
  const [closeRate, setClose] = useState(25);
  const [dealSize, setDeal] = useState(4500);

  const opens = Math.round(leadsPerMonth * (openRate / 100));
  const replies = Math.round(opens * (replyRate / 100));
  const meetings = Math.round(replies * (meetingRate / 100));
  const deals = Math.round(meetings * (closeRate / 100));
  const mrr = deals * dealSize;
  const yearly = mrr * 12;

  const funnel = [
    { label: "Prospects contactés", value: leadsPerMonth, color: "from-primary/40 to-primary/10" },
    { label: "Emails ouverts", value: opens, color: "from-accent/40 to-accent/10" },
    { label: "Réponses obtenues", value: replies, color: "from-chart-2/40 to-chart-2/10" },
    { label: "Rendez-vous décrochés", value: meetings, color: "from-chart-3/40 to-chart-3/10" },
    { label: "Deals fermés", value: deals, color: "from-success/40 to-success/10" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><Calculator className="size-7 text-primary" /> Simulateur & projections</h1>
        <p className="text-sm text-muted-foreground">Estimez le potentiel commercial de PASCAL selon vos paramètres.</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="bento bento-glow p-6 space-y-5">
          <h2 className="font-display text-lg flex items-center gap-2"><Target className="size-5 text-primary" /> Paramètres</h2>
          <RangeField label="Prospects contactés / mois" value={leadsPerMonth} onChange={setLeads} min={10} max={5000} step={10} />
          <RangeField label="Taux d'ouverture (%)" value={openRate} onChange={setOpen} min={0} max={100} />
          <RangeField label="Taux de réponse (%)" value={replyRate} onChange={setReply} min={0} max={100} />
          <RangeField label="Taux prise de RDV (%)" value={meetingRate} onChange={setMeeting} min={0} max={100} />
          <RangeField label="Taux de closing (%)" value={closeRate} onChange={setClose} min={0} max={100} />
          <div className="space-y-2">
            <Label>Panier moyen (€)</Label>
            <Input type="number" value={dealSize} onChange={(e) => setDeal(parseInt(e.target.value || "0"))} className="font-mono" />
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
            <StatCard icon={DollarSign} label="Revenus mensuels" value={`${mrr.toLocaleString("fr-FR")} €`} accent />
            <StatCard icon={TrendingUp} label="Projection annuelle" value={`${yearly.toLocaleString("fr-FR")} €`} />
            <StatCard icon={Target} label="Deals / mois" value={`${deals}`} />
            <StatCard icon={Calculator} label="RDV / mois" value={`${meetings}`} />
          </motion.div>

          <div className="bento p-5 space-y-3">
            <h3 className="font-display">Entonnoir de conversion</h3>
            {funnel.map((f, i) => (
              <motion.div key={f.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{f.label}</span><span className="font-mono">{f.value.toLocaleString("fr-FR")}</span></div>
                <div className="h-3 rounded-full bg-secondary/30 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(4, (f.value / leadsPerMonth) * 100)}%` }} transition={{ duration: 0.8, delay: i * 0.08 }} className={`h-full rounded-full bg-gradient-to-r ${f.color}`} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RangeField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><Label>{label}</Label><span className="font-mono text-sm text-primary">{value}</span></div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <motion.div whileHover={{ y: -3 }} className={`bento bento-glow p-4 relative ${accent ? "holo-border" : ""}`}>
      <Icon className="size-4 text-primary mb-2" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl ${accent ? "holo-text" : ""}`}>{value}</div>
    </motion.div>
  );
}