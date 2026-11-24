import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { peSupabase as supabase } from "@/prospect/lib/db";
import { Bento, PageHeader } from "@/prospect/components/AppShell";
import { Badge } from "@/prospect/components/ui/badge";

const STAGES = [
  ["TO_PROSPECT", "À prospecter"],
  ["ACTIVE", "Prospection active"],
  ["CONTACTED", "Contacté"],
  ["REPLIED", "Réponse reçue"],
  ["INTERESTED", "Intéressé"],
  ["MEETING", "Rendez-vous"],
  ["NOT_INTERESTED", "Non intéressé"],
] as const;

export const Route = createFileRoute("/_authenticated/prospect/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline commercial — OLLY" },
      { name: "description", content: "Suivez chaque prospect de la découverte au rendez-vous confirmé dans un pipeline visuel." },
      { property: "og:title", content: "Pipeline commercial — OLLY" },
      { property: "og:description", content: "Étapes commerciales et états techniques de chaque prospection." },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const { data } = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () =>
      (await supabase.from("pe_companies").select("id, name, city, pipeline_status, relevance_score")).data ?? [],
    refetchInterval: 15000,
  });

  return (
    <>
      <PageHeader title="Pipeline commercial" subtitle="Chaque entreprise progresse automatiquement selon les décisions d'OLLY." />
      <div className="pe-scroll-thin flex gap-4 overflow-x-auto pb-3">
        {STAGES.map(([key, label]) => {
          const items = (data ?? []).filter((company) => company.pipeline_status === key);
          return (
            <Bento key={key} className="min-w-[260px] flex-1">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{label}</h2>
                <Badge variant="soft">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((company) => (
                  <Link
                    key={company.id}
                    to="/prospect/companies/$companyId"
                    params={{ companyId: company.id }}
                    className="block rounded-2xl bg-secondary/50 p-3 transition hover:bg-secondary"
                  >
                    <p className="truncate text-sm">{company.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{company.city ?? "—"}</p>
                  </Link>
                ))}
              </div>
            </Bento>
          );
        })}
      </div>
    </>
  );
}
