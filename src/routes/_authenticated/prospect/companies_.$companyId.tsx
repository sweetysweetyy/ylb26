import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { peSupabase as supabase } from "@/prospect/lib/db";
import { startProspectionFn } from "@/prospect/lib/prospection.functions";
import { Bento, PageHeader } from "@/prospect/components/AppShell";
import { Badge } from "@/prospect/components/ui/badge";
import { Button } from "@/prospect/components/ui/button";

export const Route = createFileRoute("/_authenticated/prospect/companies_/$companyId")({
  head: () => ({
    meta: [
      { title: "Fiche entreprise intelligente — OLLY" },
      { name: "description", content: "Analyse IA complète du prospect : compréhension, signaux commerciaux, angle d'approche et prospection automatisée." },
      { property: "og:title", content: "Fiche entreprise intelligente — OLLY" },
      { property: "og:description", content: "Lancez la prospection automatisée directement depuis la fiche." },
    ],
  }),
  component: CompanyPage,
});

type Listish = Array<Record<string, unknown>>;

function asList(value: unknown): Listish {
  return Array.isArray(value) ? (value as Listish) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function CompanyPage() {
  const { companyId } = useParams({ from: "/_authenticated/prospect/companies_/$companyId" });
  const start = useServerFn(startProspectionFn);

  const company = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => (await supabase.from("pe_companies").select("*").eq("id", companyId).maybeSingle()).data,
    refetchInterval: 15000,
  });

  const prospection = useQuery({
    queryKey: ["prospection", companyId],
    queryFn: async () =>
      (await supabase.from("pe_prospections").select("*").eq("company_id", companyId).maybeSingle()).data,
    refetchInterval: 10000,
  });

  const launch = useMutation({
    mutationFn: async () => start({ data: { companyId } }),
    onSuccess: (result) => {
      toast.success(result.sent ? "Premier email envoyé par OLLY" : "Email préparé par OLLY");
      void prospection.refetch();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const item = company.data;
  if (!item) return <p className="text-sm text-muted-foreground">Chargement de la fiche…</p>;

  const understanding = asRecord(item.prospect_understanding);
  const angle = asRecord(item.approach_angle);
  const signals = asList(item.signals);
  const sources = asList(item.sources);
  const deciders = asList(item.decision_makers);

  return (
    <>
      <PageHeader
        title={item.name}
        subtitle={[item.sector, item.city, item.region].filter(Boolean).join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="live">{item.relevance_score ?? 0}/100</Badge>
            <Button variant="holo" disabled={launch.isPending} onClick={() => launch.mutate()}>
              {launch.isPending ? "OLLY prépare l'email…" : "🚀 Démarrer la prospection"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Bento span="xl:col-span-2">
          <h2 className="font-display text-lg font-semibold">Résumé intelligent</h2>
          <p className="mt-2 text-sm text-muted-foreground">{item.ai_summary ?? item.description ?? "—"}</p>
          <h3 className="mt-5 text-sm font-semibold">Pourquoi cette entreprise ?</h3>
          <p className="mt-1 text-sm text-muted-foreground">{item.why_contact ?? "—"}</p>
          <h3 className="mt-5 text-sm font-semibold">Score : {item.relevance_score ?? 0}/100</h3>
          <p className="mt-1 text-sm text-muted-foreground">{item.score_explanation ?? "—"}</p>
        </Bento>

        <Bento>
          <h2 className="font-display text-lg font-semibold">Coordonnées</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {[
              ["Site", item.website],
              ["Email", item.email],
              ["Téléphone", item.phone],
              ["Adresse", item.address],
              ["LinkedIn", item.linkedin],
              ["Taille", item.size],
              ["Création", item.founded_year],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{String(label)}</dt>
                <dd className="max-w-[60%] truncate text-right">{value ? String(value) : "—"}</dd>
              </div>
            ))}
          </dl>
          {prospection.data && (
            <div className="mt-4 rounded-2xl bg-secondary/50 p-3 text-xs">
              <Badge variant="soft">{prospection.data.state}</Badge>
              <p className="mt-2 text-muted-foreground">
                {prospection.data.follow_up_count} relance(s) · {prospection.data.pipeline_status}
              </p>
            </div>
          )}
        </Bento>

        <Bento>
          <h2 className="font-display text-lg font-semibold">Compréhension du prospect</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {Object.entries(understanding).map(([key, value]) => (
              <p key={key}>
                <span className="text-foreground">{key} : </span>
                {typeof value === "string" ? value : JSON.stringify(value)}
              </p>
            ))}
            {Object.keys(understanding).length === 0 && <p>—</p>}
          </div>
        </Bento>

        <Bento>
          <h2 className="font-display text-lg font-semibold">Signaux commerciaux</h2>
          <div className="mt-3 space-y-2">
            {signals.map((signal, index) => (
              <div key={index} className="rounded-2xl bg-secondary/50 p-3 text-xs">
                <p className="text-foreground">{String(signal["label"] ?? signal["type"] ?? "Signal")}</p>
                <p className="mt-1 text-muted-foreground">{String(signal["detail"] ?? signal["description"] ?? "")}</p>
                {Boolean(signal["source"]) && (
                  <a href={String(signal["source"])} target="_blank" rel="noreferrer" className="mt-1 block truncate text-accent">
                    {String(signal["source"])}
                  </a>
                )}
              </div>
            ))}
            {signals.length === 0 && <p className="text-sm text-muted-foreground">Aucun signal détecté.</p>}
          </div>
        </Bento>

        <Bento>
          <h2 className="font-display text-lg font-semibold">Angle d'approche</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {Object.entries(angle).map(([key, value]) => (
              <p key={key}>
                <span className="text-foreground">{key} : </span>
                {typeof value === "string" ? value : JSON.stringify(value)}
              </p>
            ))}
            {Object.keys(angle).length === 0 && <p>—</p>}
          </div>
          {deciders.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Décideurs potentiels</h3>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {deciders.map((decider, index) => (
                  <li key={index}>{String(decider["role"] ?? decider["name"] ?? "")}</li>
                ))}
              </ul>
            </>
          )}
        </Bento>

        <Bento span="xl:col-span-3">
          <h2 className="font-display text-lg font-semibold">Sources</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <a
                key={index}
                href={String(source["url"] ?? source)}
                target="_blank"
                rel="noreferrer"
                className="max-w-full truncate rounded-full bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {String(source["title"] ?? source["url"] ?? source)}
              </a>
            ))}
            {sources.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </Bento>
      </div>
    </>
  );
}
