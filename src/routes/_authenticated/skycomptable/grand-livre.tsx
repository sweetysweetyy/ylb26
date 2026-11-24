import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, useTable } from "@/skycomptable/components/CrudTable";
import { usePostedLines } from "@/skycomptable/lib/ledger";
import { formatEUR, round2 } from "@/skycomptable/lib/accounting";
import { Input } from "@/skycomptable/components/ui/input";
import { Label } from "@/skycomptable/components/ui/label";

export const Route = createFileRoute("/_authenticated/skycomptable/grand-livre")({
  head: () => ({
    meta: [
      { title: "Grand livre — Registre" },
      { name: "description", content: "Mouvements validés par compte." },
      { property: "og:title", content: "Grand livre — Registre" },
      { property: "og:description", content: "Mouvements validés par compte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const accounts = useTable<{ id: string; code: string; name: string }>("skc_chart_accounts", "code");
  const lines = usePostedLines(from || undefined, to || undefined);
  const byAcc = new Map<string, typeof lines.data>();
  for (const l of lines.data ?? []) byAcc.set(l.account_id, [...(byAcc.get(l.account_id) ?? []), l]);

  return (
    <div>
      <PageHeader title="Grand livre" subtitle="Écritures validées, par compte." />
      <div className="mb-4 flex gap-3">
        <div className="grid gap-1"><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="grid gap-1"><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {byAcc.size === 0 && <p className="text-muted-foreground">{lines.isLoading ? "Chargement…" : "Aucun mouvement validé."}</p>}
      <div className="space-y-6">
        {(accounts.data ?? []).filter((a) => byAcc.has(a.id)).map((a) => {
          let run = 0;
          return (
            <section key={a.id} className="rounded-md border border-border bg-card">
              <h2 className="border-b border-border px-3 py-2 text-lg"><span className="num">{a.code}</span> {a.name}</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-3 py-1">Date</th><th className="px-3">N°</th><th className="px-3">Libellé</th><th className="px-3 text-right">Débit</th><th className="px-3 text-right">Crédit</th><th className="px-3 text-right">Solde</th></tr></thead>
                <tbody>
                  {byAcc.get(a.id)!.map((l) => {
                    run = round2(run + +l.debit - +l.credit);
                    return (
                      <tr key={l.id} className="border-t border-border">
                        <td className="num px-3 py-1">{l.skc_accounting_entries.entry_date}</td>
                        <td className="num px-3">{l.skc_accounting_entries.entry_number}</td>
                        <td className="px-3">{l.label}</td>
                        <td className="num px-3 text-right">{+l.debit ? formatEUR(l.debit) : ""}</td>
                        <td className="num px-3 text-right">{+l.credit ? formatEUR(l.credit) : ""}</td>
                        <td className="num px-3 text-right">{formatEUR(run)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </div>
  );
}
