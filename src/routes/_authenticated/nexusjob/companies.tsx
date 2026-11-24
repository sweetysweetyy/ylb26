import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Loader2, Search } from "lucide-react";
import { useSession } from "@/nexusjob/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { researchCompanyFn } from "@/nexusjob/lib/company.functions";
import { PageContainer, PageHeader } from "@/nexusjob/components/page-header";
import { Card } from "@/nexusjob/components/ui/card";
import { Button } from "@/nexusjob/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/nexusjob/components/ui/badge";

export const Route = createFileRoute("/_authenticated/nexusjob/companies")({
  head: () => ({
    meta: [
      { title: "Intelligence entreprises — NexusJob" },
      { name: "description", content: "Analyse complète d'une entreprise pour préparer votre entretien : culture, actualités, questions probables." },
      { property: "og:title", content: "Intelligence entreprises — NexusJob" },
      { property: "og:description", content: "Fiches entreprises générées par recherche web et IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompaniesPage,
});

const list = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

function CompaniesPage() {
  const { user } = useSession();
  const research = useServerFn(researchCompanyFn);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: reports = [], refetch } = useQuery({
    queryKey: ["company-reports", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("nxj_company_reports")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as Record<string, any>[];
    },
  });

  const launch = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await research({ data: { company: name.trim() } });
      toast.success(`Fiche entreprise générée pour ${name}.`);
      setName("");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analyse impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Intelligence entreprises"
        subtitle="Recherche web Firecrawl + synthèse IA : tout ce qu'il faut savoir avant un entretien."
      />

      <Card variant="bento" className="flex flex-col gap-3 p-6 sm:flex-row">
        <Input
          placeholder="Nom de l'entreprise (ex : Groupe Caillé)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && launch()}
        />
        <Button variant="holo" onClick={launch} disabled={busy || !name.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Analyser
        </Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.id} variant="bento" className="space-y-3 p-6">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-nxj-holo-2" />
              <h2 className="font-display text-lg font-semibold">{r.company}</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[r.sector, r.location, r.size, r.founded].filter(Boolean).map((v: string) => (
                <Badge key={v} variant="nxj-glass">{v}</Badge>
              ))}
            </div>
            {r.overview && <p className="text-sm text-muted-foreground">{r.overview}</p>}
            {list(r.culture).length > 0 && (
              <Section title="Culture & valeurs" items={list(r.culture)} />
            )}
            {list(r.interview_questions).length > 0 && (
              <Section title="Questions probables en entretien" items={list(r.interview_questions)} />
            )}
            {list(r.questions_to_ask).length > 0 && (
              <Section title="Questions à poser" items={list(r.questions_to_ask)} />
            )}
            {list(r.talking_points).length > 0 && (
              <Section title="Vos arguments personnalisés" items={list(r.talking_points)} />
            )}
            {Array.isArray(r.sources) && r.sources.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {(r.sources as { url: string; title: string }[]).slice(0, 5).map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                    <Badge variant="soft" className="max-w-[220px] truncate">{s.title}</Badge>
                  </a>
                ))}
              </div>
            )}
          </Card>
        ))}
        {!reports.length && (
          <p className="text-sm text-muted-foreground">Aucune fiche entreprise pour l'instant.</p>
        )}
      </div>
    </PageContainer>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-white/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-nxj-holo-3">{title}</p>
      <ul className="mt-1.5 space-y-1 text-sm">
        {items.slice(0, 6).map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}
