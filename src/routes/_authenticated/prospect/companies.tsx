import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { peSupabase as supabase } from "@/prospect/lib/db";
import { Bento, PageHeader } from "@/prospect/components/AppShell";
import { Badge } from "@/prospect/components/ui/badge";

export const Route = createFileRoute("/_authenticated/prospect/companies")({
  head: () => ({
    meta: [
      { title: "Fiches entreprises enrichies — OLLY" },
      { name: "description", content: "Toutes vos fiches entreprises avec score de pertinence, signaux commerciaux et angle d'approche IA." },
      { property: "og:title", content: "Fiches entreprises enrichies — OLLY" },
      { property: "og:description", content: "Score, signaux et analyse commerciale IA pour chaque prospect." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { data } = useQuery({
    queryKey: ["companies"],
    queryFn: async () =>
      (await supabase.from("pe_companies").select("*").order("relevance_score", { ascending: false })).data ?? [],
    refetchInterval: 15000,
  });

  return (
    <>
      <PageHeader title="Fiches entreprises" subtitle="Chaque fiche est enrichie et analysée commercialement par l'IA." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((company) => (
          <Bento key={company.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display truncate text-base font-semibold">{company.name}</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {[company.sector, company.city].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <Badge variant="live">{company.relevance_score ?? 0}/100</Badge>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{company.ai_summary ?? company.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <Badge variant="soft">{company.pipeline_status}</Badge>
              <Link
                to="/prospect/companies/$companyId"
                params={{ companyId: company.id }}
                className="text-xs text-accent hover:underline"
              >
                Ouvrir la fiche
              </Link>
            </div>
          </Bento>
        ))}
        {(data ?? []).length === 0 && (
          <Bento span="md:col-span-2 xl:col-span-3">
            <p className="text-sm text-muted-foreground">
              Aucune fiche pour l'instant. Lancez une recherche en langage naturel depuis l'onglet Recherche IA.
            </p>
          </Bento>
        )}
      </div>
    </>
  );
}
