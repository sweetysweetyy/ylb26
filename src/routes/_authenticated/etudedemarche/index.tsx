import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, BookOpenCheck, Clock, FileBarChart, Sparkles, Target } from "lucide-react";

import { Badge } from "@/etudedemarche/components/ui/badge";
import { Button } from "@/etudedemarche/components/ui/button";
import { Card } from "@/etudedemarche/components/ui/card";
import { useAuth } from "@/etudedemarche/hooks/useAuth";
import { useMethodologies, useStudies } from "@/etudedemarche/lib/queries";
import { AI_MODELS } from "@/etudedemarche/lib/study-types";
import { useSettings } from "@/etudedemarche/lib/queries";

export const Route = createFileRoute("/_authenticated/etudedemarche/")({
  head: () => ({
    meta: [
      { title: "Cockpit — Étude de marché" },
      { name: "description", content: "Vue d'ensemble de vos études de marché et de vos méthodologies." },
      { property: "og:title", content: "Cockpit — Étude de marché" },
      { property: "og:description", content: "Pilotez vos études de marché IA depuis un cockpit unique." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: studies = [] } = useStudies();
  const { data: methodologies = [] } = useMethodologies();
  const { data: settings } = useSettings(user?.id);

  const completed = studies.filter((s) => s.status === "completed").length;
  const running = studies.filter((s) => s.status === "researching" || s.status === "analyzing");
  const model = AI_MODELS.find((m) => m.id === settings?.model)?.label ?? settings?.model;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="halo">
        <Badge variant="live">Cockpit en direct</Badge>
        <h1 className="mt-3 font-display text-3xl md:text-4xl">
          Bonjour<span className="text-holo">.</span> Quelle décision devons-nous éclairer aujourd'hui ?
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Décrivez votre besoin en langage naturel : Étude de marché cadre la demande, mène l'étude et
          vous livre un rapport prêt à déposer auprès d'un organisme officiel.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="holo" size="lg" asChild>
            <Link to="/etudedemarche/studies/new">
              <Sparkles /> Lancer une étude
            </Link>
          </Button>
          <Button variant="glass" size="lg" asChild>
            <Link to="/etudedemarche/methodologies">
              <BookOpenCheck /> Mes méthodologies
            </Link>
          </Button>
        </div>
      </motion.header>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={FileBarChart} label="Études créées" value={studies.length} />
        <Stat icon={Target} label="Études finalisées" value={completed} />
        <Stat icon={Clock} label="En cours" value={running.length} />
        <Stat icon={BookOpenCheck} label="Règles actives" value={methodologies.filter((m) => m.is_active).length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="bento" className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg">Dernières études</h2>
            <Link to="/etudedemarche/studies" className="text-xs text-muted-foreground hover:text-foreground">
              Tout voir
            </Link>
          </div>
          {studies.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune étude pour l'instant. Lancez la première, il suffit d'une phrase.
            </p>
          ) : (
            <ul className="space-y-2">
              {studies.slice(0, 5).map((study) => (
                <li key={study.id}>
                  <Link
                    to="/etudedemarche/studies/$id"
                    params={{ id: study.id }}
                    className="group flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{study.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(study.created_at).toLocaleDateString("fr-FR")} ·{" "}
                        {statusLabel(study.status)}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card variant="bento" className="p-6">
          <h2 className="font-display text-lg">Moteur d'analyse</h2>
          <p className="mt-1 text-xs text-muted-foreground">Modèle utilisé pour vos prochaines études.</p>
          <p className="mt-5 font-display text-2xl text-holo">{model}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Niveau de détail : {settings?.depth ?? "standard"}
          </p>
          <Button variant="glass" className="mt-6 w-full" asChild>
            <Link to="/etudedemarche/settings">Changer de modèle</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileBarChart;
  label: string;
  value: number;
}) {
  return (
    <Card variant="bento" className="p-5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-4 font-display text-3xl">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Brouillon",
    analyzing: "Cadrage en cours",
    analyzed: "Cadrée, prête à lancer",
    researching: "Étude en cours",
    completed: "Terminée",
    failed: "Échec",
  };
  return map[status] ?? status;
}