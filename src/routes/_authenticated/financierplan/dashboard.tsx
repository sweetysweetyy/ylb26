import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowUpRight, FileBarChart, Plus, Rocket, Wallet } from "lucide-react";
import { fpSupabase as supabase } from "@/financierplan/lib/db";
import { useAuth } from "@/financierplan/hooks/useAuth";
import { Card } from "@/financierplan/components/ui/card";
import { Badge } from "@/financierplan/components/ui/badge";
import { Button } from "@/financierplan/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/financierplan/lib/format";
import { SECTIONS } from "@/financierplan/lib/sections";

export const Route = createFileRoute("/_authenticated/financierplan/dashboard")({
  head: () => ({
    meta: [
      { title: "Cockpit — Previsio" },
      {
        name: "description",
        content: "Pilotez tous vos prévisionnels financiers depuis un cockpit unique.",
      },
      { property: "og:title", content: "Cockpit — Previsio" },
      { property: "og:description", content: "Vos projets de prévisionnel financier en un coup d'œil." },
    ],
  }),
  component: Dashboard,
});

type Project = {
  id: string;
  name: string;
  sector: string | null;
  location: string | null;
  status: string;
  progress: number;
  updated_at: string;
  currency: string;
};

function Dashboard() {
  const { user } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["fp_projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fp_projects")
        .select("id, name, sector, location, status, progress, updated_at, currency")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const total = projects?.length ?? 0;
  const done = projects?.filter((p) => p.progress >= 100).length ?? 0;
  const avg = total ? Math.round((projects ?? []).reduce((a, p) => a + p.progress, 0) / total) : 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <Badge variant="live">Espace de travail actif</Badge>
          <h1 className="mt-3 font-display text-3xl font-semibold">
            Bonjour{user?.user_metadata?.["full_name"] ? `, ${user.user_metadata["full_name"]}` : ""}.
          </h1>
          <p className="mt-1 text-muted-foreground">
            Construisez des prévisions financières bancables, volet par volet.
          </p>
        </div>
        <Button asChild variant="holo" size="lg">
          <Link to="/financierplan/nouveau">
            <Plus className="size-4" /> Nouveau prévisionnel
          </Link>
        </Button>
      </motion.div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { label: "Projets", value: String(total), icon: FileBarChart },
          { label: "Dossiers complets", value: `${done}`, icon: Rocket },
          { label: "Avancement moyen", value: `${avg} %`, icon: Wallet },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <Card variant="bento" className="flex items-center gap-4 p-6">
              <div className="grid size-11 place-items-center rounded-xl bg-secondary/70">
                <stat.icon className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-display text-2xl font-semibold">{stat.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-lg font-semibold">Vos projets</h2>

      {isLoading ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : total === 0 ? (
        <Card variant="bento" className="mt-4 holo-halo p-10 text-center">
          <h3 className="font-display text-xl font-semibold">Aucun prévisionnel pour l'instant</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Décrivez votre idée en langage naturel : l'IA construit vos {SECTIONS.length} volets
            financiers, du plan de développement à la demande de financement bancaire.
          </p>
          <Button asChild variant="holo" size="lg" className="mt-6">
            <Link to="/financierplan/nouveau">Démarrer mon prévisionnel</Link>
          </Button>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects!.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <Link to="/financierplan/projet/$id" params={{ id: p.id }} className="block h-full">
                <Card variant="bento" className="group h-full p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold leading-tight">{p.name}</h3>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[p.sector, p.location].filter(Boolean).join(" · ") || "Projet en préparation"}
                  </p>
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Avancement</span>
                      <span className="font-medium">{p.progress} %</span>
                    </div>
                    <Progress value={p.progress} className="h-1.5" />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant={p.progress >= 100 ? "live" : "muted"}>
                      {p.progress >= 100 ? "Dossier complet" : "En construction"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(p.updated_at)}
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
