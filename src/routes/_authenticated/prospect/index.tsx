import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { peSupabase as supabase } from "@/prospect/lib/db";
import { Bento, PageHeader } from "@/prospect/components/AppShell";
import { Badge } from "@/prospect/components/ui/badge";
import { Button } from "@/prospect/components/ui/button";

export const Route = createFileRoute("/_authenticated/prospect/")({
  head: () => ({
    meta: [
      { title: "Cockpit — Prospection intelligente OLLY" },
      {
        name: "description",
        content:
          "Pilotez vos recherches IA, vos fiches entreprises enrichies et vos prospections Gmail automatisées depuis un cockpit unique.",
      },
      { property: "og:title", content: "Cockpit — Prospection intelligente OLLY" },
      {
        property: "og:description",
        content: "Vue temps réel des prospects, emails envoyés, réponses et rendez-vous obtenus.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [companies, prospections, messages, decisions] = await Promise.all([
        supabase.from("pe_companies").select("id, name, relevance_score, city, pipeline_status, created_at").order("relevance_score", { ascending: false }).limit(200),
        supabase.from("pe_prospections").select("id, state, pipeline_status, interest_score"),
        supabase.from("pe_messages").select("id, direction, created_at"),
        supabase.from("pe_decisions").select("id, kind, rationale, created_at").order("created_at", { ascending: false }).limit(6),
      ]);
      return {
        companies: companies.data ?? [],
        prospections: prospections.data ?? [],
        messages: messages.data ?? [],
        decisions: decisions.data ?? [],
      };
    },
    refetchInterval: 20000,
  });

  const companies = data?.companies ?? [];
  const prospections = data?.prospections ?? [];
  const messages = data?.messages ?? [];
  const sent = messages.filter((m) => m.direction === "OUTBOUND").length;
  const received = messages.filter((m) => m.direction === "INBOUND").length;
  const active = prospections.filter((p) => ["ACTIVE", "WAITING_REPLY", "PROCESSING_REPLY", "READY"].includes(p.state ?? "")).length;
  const meetings = prospections.filter((p) => p.pipeline_status === "MEETING").length;
  const rate = sent ? Math.round((received / sent) * 100) : 0;

  const kpis = [
    { label: "Prospects", value: companies.length },
    { label: "Prospections actives", value: active },
    { label: "Emails envoyés", value: sent },
    { label: "Réponses reçues", value: received },
    { label: "Taux de réponse", value: `${rate}%` },
    { label: "Rendez-vous", value: meetings },
  ];

  return (
    <>
      <PageHeader
        title="Cockpit de prospection"
        subtitle="Vos recherches IA, vos fiches enrichies et l'activité d'OLLY en temps réel."
        actions={
          <Button variant="holo" asChild>
            <Link to="/prospect/search">Nouvelle recherche IA</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Bento key={kpi.label}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="font-display pe-text-holo mt-2 text-3xl font-semibold">{kpi.value}</p>
          </Bento>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Bento span="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Meilleurs prospects</h2>
            <Link to="/prospect/companies" className="text-xs text-muted-foreground hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="space-y-2">
            {companies.slice(0, 7).map((company) => (
              <Link
                key={company.id}
                to="/prospect/companies/$companyId"
                params={{ companyId: company.id }}
                className="flex items-center justify-between rounded-2xl bg-secondary/50 px-4 py-3 transition hover:bg-secondary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{company.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {company.city ?? "—"} · {company.pipeline_status}
                  </p>
                </div>
                <Badge variant="live">{company.relevance_score ?? 0}/100</Badge>
              </Link>
            ))}
            {companies.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun prospect pour l'instant. Lancez votre première recherche en langage naturel.
              </p>
            )}
          </div>
        </Bento>

        <Bento>
          <h2 className="font-display mb-4 text-lg font-semibold">Décisions d'OLLY</h2>
          <div className="space-y-3">
            {(data?.decisions ?? []).map((decision) => (
              <div key={decision.id} className="rounded-2xl bg-secondary/50 p-3">
                <Badge variant="soft">{decision.kind}</Badge>
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{decision.rationale}</p>
              </div>
            ))}
            {(data?.decisions ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">OLLY n'a pas encore pris de décision.</p>
            )}
          </div>
        </Bento>
      </div>
    </>
  );
}
