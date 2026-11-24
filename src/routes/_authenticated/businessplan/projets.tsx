import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bp } from "@/businessplan/lib/db";
import { PageHeader } from "@/businessplan/components/AppShell";
import { PlanStatusBadge } from "@/businessplan/components/PlanStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/businessplan/lib/format";

export const Route = createFileRoute("/_authenticated/businessplan/projets")({
  head: () => ({
    meta: [
      { title: "Mes projets — Plan Studio" },
      { name: "description", content: "Retrouvez tous vos business plans reconstruits et leur score de qualité." },
      { property: "og:title", content: "Mes projets — Plan Studio" },
      { property: "og:description", content: "Bibliothèque de vos dossiers de financement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projects,
});

function Projects() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");

  const { data: plans = [], isLoading } = useQuery({
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

  const filtered = plans.filter((p) => p.title.toLowerCase().includes(term.toLowerCase()));

  async function remove(id: string) {
    const { error } = await bp().from("bp_plans").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible");
      return;
    }
    toast.success("Projet supprimé");
    void qc.invalidateQueries({ queryKey: ["bp-plans"] });
  }

  return (
    <div className="pb-16">
      <PageHeader
        title="Mes projets"
        subtitle={`${plans.length} business plan${plans.length > 1 ? "s" : ""} dans votre studio.`}
        actions={
          <Button asChild>
            <Link to="/businessplan/nouveau">
              <Plus className="mr-1.5 h-4 w-4" /> Nouveau plan
            </Link>
          </Button>
        }
      />

      <div className="px-8 py-7">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Rechercher un projet…" className="pl-9" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((plan) => {
            const score = (plan.quality as { score?: number } | null)?.score;
            return (
              <div key={plan.id} className="bp-card group flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <FileText className="h-4 w-4" />
                  </span>
                  <PlanStatusBadge status={plan.status} />
                </div>
                <Link to="/businessplan/plan/$id" params={{ id: plan.id }} className="mt-4 block">
                  <h3 className="font-display text-base font-semibold leading-snug transition-colors group-hover:text-primary">
                    {plan.title}
                  </h3>
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.source_filename ?? "Document importé"} · {formatDate(plan.updated_at)}
                </p>
                {typeof score === "number" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Qualité</span>
                      <span className="font-medium text-foreground">{score}/100</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                )}
                <div className="mt-5 flex items-center gap-2">
                  <Button asChild size="sm" variant="secondary" className="flex-1">
                    <Link to="/businessplan/plan/$id" params={{ id: plan.id }}>
                      Ouvrir
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(plan.id)} aria-label="Supprimer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {!isLoading && !filtered.length && (
          <div className="bp-card mt-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">Aucun projet trouvé.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/businessplan/nouveau">Importer un business plan</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
