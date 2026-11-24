import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FileText, Gauge, Plus, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bp } from "@/businessplan/lib/db";
import { PageHeader } from "@/businessplan/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/businessplan/lib/format";
import { PlanStatusBadge } from "@/businessplan/components/PlanStatusBadge";

export const Route = createFileRoute("/_authenticated/businessplan/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Plan Studio" },
      { name: "description", content: "Pilotez vos business plans : qualité, projets récents et génération de dossiers de financement." },
      { property: "og:title", content: "Tableau de bord — Plan Studio" },
      { property: "og:description", content: "Vue d'ensemble de vos dossiers de financement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: plans = [] } = useQuery({
    queryKey: ["bp-plans"],
    queryFn: async () => {
      const { data, error } = await bp()
        .from("bp_plans")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const ready = plans.filter((p) => p.status === "ready");
  const scores = ready
    .map((p) => (p.quality as { score?: number } | null)?.score)
    .filter((s): s is number => typeof s === "number");
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className="pb-16">
      <PageHeader
        title="Tableau de bord"
        subtitle="Votre studio de transformation de business plans."
        actions={
          <Button asChild>
            <Link to="/businessplan/nouveau">
              <Plus className="mr-1.5 h-4 w-4" /> Nouveau plan
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 px-8 py-7 md:grid-cols-3">
        <StatCard icon={FileText} label="Projets" value={String(plans.length)} hint="Business plans importés" />
        <StatCard icon={Sparkles} label="Dossiers finalisés" value={String(ready.length)} hint="Prêts pour le financement" />
        <StatCard
          icon={Gauge}
          label="Score qualité moyen"
          value={avgScore !== null ? `${avgScore}/100` : "—"}
          hint="Contrôle automatique du document"
        />
      </div>

      <div className="grid gap-4 px-8 lg:grid-cols-[1.35fr_1fr]">
        <section className="bp-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Projets récents</h2>
            <Link to="/businessplan/projets" className="text-sm text-primary hover:underline">
              Tout voir
            </Link>
          </div>

          <div className="mt-5 space-y-2.5">
            {plans.slice(0, 6).map((plan) => (
              <Link
                key={plan.id}
                to="/businessplan/plan/$id"
                params={{ id: plan.id }}
                className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/50 px-4 py-3 transition-all hover:border-primary/40 hover:shadow-[0_18px_40px_-30px] hover:shadow-primary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{plan.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Mis à jour le {formatDate(plan.updated_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PlanStatusBadge status={plan.status} />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
            {!plans.length && (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <p className="text-sm text-muted-foreground">Aucun projet pour l'instant.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/businessplan/nouveau">Importer mon premier business plan</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="bp-card overflow-hidden p-6">
          <Badge variant="secondary" className="rounded-full">
            <TrendingUp className="mr-1 h-3 w-3" /> Méthode
          </Badge>
          <h2 className="mt-4 font-display text-lg font-semibold">Comment ça marche</h2>
          <ol className="mt-4 space-y-4">
            {[
              ["Importez votre PDF", "Votre business plan existant, tel quel."],
              ["Analyse en profondeur", "L'IA extrait textes, tableaux et données financières."],
              ["Reconstruction", "Tableaux dynamiques, graphiques et structure professionnelle."],
              ["Identité visuelle", "Vos couleurs, votre logo, votre typographie."],
              ["Export PDF", "Un dossier prêt pour vos financeurs."],
            ].map(([title, text], i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[0.7rem] font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="text-xs text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
            Aucune donnée chiffrée n'est inventée : l'IA travaille uniquement à partir des informations réelles de votre
            document.
          </p>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bp-card relative overflow-hidden p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/50 blur-2xl" />
    </div>
  );
}
