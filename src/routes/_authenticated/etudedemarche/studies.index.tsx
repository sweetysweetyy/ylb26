import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { statusLabel } from "./index";
import { Badge } from "@/etudedemarche/components/ui/badge";
import { Button } from "@/etudedemarche/components/ui/button";
import { Card } from "@/etudedemarche/components/ui/card";
import { useStudies } from "@/etudedemarche/lib/queries";

export const Route = createFileRoute("/_authenticated/etudedemarche/studies/")({
  head: () => ({
    meta: [
      { title: "Mes études — Étude de marché" },
      { name: "description", content: "Retrouvez toutes vos études de marché générées et téléchargeables en PDF." },
      { property: "og:title", content: "Mes études — Étude de marché" },
      { property: "og:description", content: "Historique complet de vos études de marché." },
    ],
  }),
  component: StudiesPage,
});

function StudiesPage() {
  const { data: studies = [], isLoading } = useStudies();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Mes études</h1>
          <p className="text-sm text-muted-foreground">
            {studies.length} étude{studies.length > 1 ? "s" : ""} enregistrée
            {studies.length > 1 ? "s" : ""} en temps réel.
          </p>
        </div>
        <Button variant="holo" asChild>
          <Link to="/etudedemarche/studies/new">
            <Sparkles /> Nouvelle étude
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : studies.length === 0 ? (
        <Card variant="bento" className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune étude. Décrivez votre besoin en une phrase et laissez le moteur travailler.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {studies.map((study, i) => (
            <motion.div
              key={study.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link to="/etudedemarche/studies/$id" params={{ id: study.id }}>
                <Card variant="bento" className="group h-full p-6">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant={study.status === "completed" ? "holo" : "live"}>
                      {statusLabel(study.status)}
                    </Badge>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
                  </div>
                  <h2 className="mt-4 font-display text-lg leading-snug">{study.title}</h2>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{study.brief}</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {new Date(study.created_at).toLocaleString("fr-FR")}
                  </p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}