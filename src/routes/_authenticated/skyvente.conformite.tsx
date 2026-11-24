import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/skyvente/components/ui/button";
import { PageHeader } from "@/skyvente/components/AppShell";
import { sb } from "@/skyvente/lib/supabase";
import { loadSettings } from "@/skyvente/lib/settings";
import { missingCompanyFields, numberingGaps, salesJournalCsv } from "@/skyvente/lib/compliance";
import type { Doc, Settings } from "@/skyvente/lib/types";

export const Route = createFileRoute("/_authenticated/skyvente/conformite")({
  head: () => ({ meta: [{ title: "Conformité — PrestaFlow" }, { name: "description", content: "Contrôle de conformité et journal des ventes." }] }),
  component: Compliance,
});

function Compliance() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    sb().from("sv_documents").select("*").in("type", ["invoice", "credit_note"]).neq("status", "draft")
      .then(({ data }) => setDocs((data as Doc[]) || []));
    loadSettings().then(setSettings);
  }, []);

  const missing = settings ? missingCompanyFields(settings.company) : [];
  const gaps = numberingGaps(docs.map((d) => d.number ?? ""));
  const yearDocs = docs.filter((d) => d.issue_date?.startsWith(year));
  const years = [...new Set([String(new Date().getFullYear()), ...docs.map((d) => d.issue_date?.slice(0, 4))])].filter(Boolean).sort().reverse();

  const exportCsv = () => {
    const blob = new Blob([salesJournalCsv(yearDocs)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `journal-des-ventes-${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Item = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 text-sm">
      {ok ? <CheckCircle2 className="size-4 shrink-0 text-primary" /> : <AlertTriangle className="size-4 shrink-0 text-destructive" />}
      <div>{children}</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Conformité" subtitle="Mentions obligatoires, numérotation et journal des ventes" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="sv-bento space-y-3 p-6">
          <h3 className="text-lg font-bold">Informations de l'entreprise</h3>
          {missing.length === 0 ? <Item ok>Toutes les mentions obligatoires sont renseignées.</Item> : (
            <>
              {missing.map((m) => <Item key={m} ok={false}>{m}</Item>)}
              <Link to="/skyvente/settings" className="text-sm text-primary hover:underline">Compléter dans Paramètres →</Link>
            </>
          )}
        </div>
        <div className="sv-bento space-y-3 p-6">
          <h3 className="text-lg font-bold">Numérotation continue</h3>
          {gaps.length === 0 ? <Item ok>Aucun trou dans la numérotation des factures et avoirs.</Item>
            : <Item ok={false}>Numéros manquants : {gaps.join(", ")}</Item>}
          <Item ok>{docs.length} document(s) fiscal(aux) validé(s) et scellé(s) par empreinte SHA-256.</Item>
        </div>
        <div className="sv-bento space-y-4 p-6 md:col-span-2">
          <h3 className="text-lg font-bold">Journal des ventes</h3>
          <p className="text-sm text-muted-foreground">Export CSV (factures et avoirs validés) à transmettre à votre expert-comptable.</p>
          <div className="flex flex-wrap items-center gap-3">
            <select className="sv-field w-32" value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button variant="holo" onClick={exportCsv} disabled={yearDocs.length === 0}><Download /> Exporter ({yearDocs.length})</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
