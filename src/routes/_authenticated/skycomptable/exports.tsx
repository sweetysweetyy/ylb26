import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/skycomptable/lib/supabase";
import { useCompany } from "@/skycomptable/lib/session";
import { PageHeader, useTable } from "@/skycomptable/components/CrudTable";
import { Button } from "@/skycomptable/components/ui/button";
import { Input } from "@/skycomptable/components/ui/input";
import { Label } from "@/skycomptable/components/ui/label";
import { formatEUR } from "@/skycomptable/lib/accounting";
import { buildFec, fecFileName, vatSummary, type FecLine } from "@/skycomptable/lib/invoicing";

export const Route = createFileRoute("/_authenticated/skycomptable/exports")({
  head: () => ({
    meta: [
      { title: "FEC & TVA — Registre" },
      { name: "description", content: "Export du fichier des écritures comptables et synthèse de TVA." },
      { property: "og:title", content: "FEC & TVA — Registre" },
      { property: "og:description", content: "Export du fichier des écritures comptables et synthèse de TVA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type Row = {
  label: string; debit: number; credit: number; lettering_code: string | null; lettered_at: string | null;
  skc_chart_accounts: { code: string; name: string }; skc_contacts: { display_name: string; customer_code: string | null; supplier_code: string | null } | null;
  skc_accounting_entries: { entry_number: string; entry_date: string; reference: string | null; posted_at: string; status: string; skc_journals: { code: string; name: string } };
};

function Page() {
  const { data: ctx } = useCompany();
  const periods = useTable<{ id: string; name: string; start_date: string; end_date: string }>("skc_fiscal_periods", "start_date");
  const y = new Date().getFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo] = useState(`${y}-12-31`);
  const [vat, setVat] = useState<ReturnType<typeof vatSummary> | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("skc_accounting_entry_lines")
      .select("label, debit, credit, lettering_code, lettered_at, line_number, skc_chart_accounts(code, name), skc_contacts(display_name, customer_code, supplier_code), skc_accounting_entries!inner(entry_number, entry_date, reference, posted_at, status, skc_journals(code, name))")
      .eq("company_id", ctx!.company.id).eq("skc_accounting_entries.status", "posted")
      .gte("skc_accounting_entries.entry_date", from).lte("skc_accounting_entries.entry_date", to).limit(100000);
    if (error) throw error;
    return (data as unknown as Row[]).sort((a, b) =>
      a.skc_accounting_entries.entry_date.localeCompare(b.skc_accounting_entries.entry_date) || a.skc_accounting_entries.entry_number.localeCompare(b.skc_accounting_entries.entry_number));
  }

  async function exportFec() {
    setBusy(true);
    try {
      const rows = await load();
      if (!rows.length) { toast.error("Aucune écriture validée sur la période."); return; }
      const lines: FecLine[] = rows.map((r) => ({
        journal_code: r.skc_accounting_entries.skc_journals.code, journal_name: r.skc_accounting_entries.skc_journals.name,
        entry_number: r.skc_accounting_entries.entry_number, entry_date: r.skc_accounting_entries.entry_date,
        account_code: r.skc_chart_accounts.code, account_name: r.skc_chart_accounts.name,
        aux_code: r.skc_contacts ? (r.skc_contacts.customer_code ?? r.skc_contacts.supplier_code ?? r.skc_contacts.display_name) : null, aux_name: r.skc_contacts?.display_name ?? null,
        reference: r.skc_accounting_entries.reference, label: r.label, debit: Number(r.debit), credit: Number(r.credit),
        lettering_code: r.lettering_code, lettered_at: r.lettered_at, posted_at: r.skc_accounting_entries.posted_at,
      }));
      const blob = new Blob([buildFec(lines)], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fecFileName(ctx!.company.siret, to);
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`FEC généré : ${lines.length} lignes`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  async function computeVat() {
    setBusy(true);
    try {
      const rows = await load();
      setVat(vatSummary(rows.map((r) => ({ account_code: r.skc_chart_accounts.code, debit: Number(r.debit), credit: Number(r.credit) }))));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="FEC & TVA" subtitle="Seules les écritures validées sont prises en compte. À faire contrôler par votre expert-comptable avant tout dépôt." />
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="grid gap-1"><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="grid gap-1"><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        {(periods.data ?? []).map((p) => (
          <Button key={p.id} size="sm" variant="outline" onClick={() => { setFrom(p.start_date); setTo(p.end_date); setVat(null); }}>{p.name}</Button>
        ))}
      </div>
      <section className="mb-8 rounded-md border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Fichier des écritures comptables (FEC)</h2>
        <p className="mb-3 text-sm text-muted-foreground">18 colonnes séparées par tabulation, nommé SIRENFECAAAAMMJJ.txt (SIREN tiré du SIRET de la société).</p>
        <Button disabled={busy} onClick={exportFec}>Télécharger le FEC</Button>
      </section>
      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Synthèse de TVA</h2>
        <p className="mb-3 text-sm text-muted-foreground">Calculée sur les comptes 4457 (TVA collectée) et 4456 (TVA déductible).</p>
        <Button disabled={busy} variant="outline" onClick={computeVat}>Calculer</Button>
        {vat && (
          <table className="mt-4 w-full text-sm">
            <tbody>
              <tr className="border-t border-border"><td className="py-2">TVA collectée</td><td className="num text-right">{formatEUR(vat.collected)}</td></tr>
              <tr className="border-t border-border"><td className="py-2">TVA déductible</td><td className="num text-right">{formatEUR(vat.deductible)}</td></tr>
              <tr className="border-t border-border font-semibold"><td className="py-2">{vat.net >= 0 ? "TVA nette à payer" : "Crédit de TVA"}</td><td className="num text-right">{formatEUR(Math.abs(vat.net))}</td></tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
