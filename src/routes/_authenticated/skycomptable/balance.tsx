import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, useTable } from "@/skycomptable/components/CrudTable";
import { usePostedLines } from "@/skycomptable/lib/ledger";
import { formatEUR, round2, trialBalance } from "@/skycomptable/lib/accounting";
import { Input } from "@/skycomptable/components/ui/input";
import { Label } from "@/skycomptable/components/ui/label";

export const Route = createFileRoute("/_authenticated/skycomptable/balance")({
  head: () => ({
    meta: [
      { title: "Balance — Registre" },
      { name: "description", content: "Balance générale des comptes." },
      { property: "og:title", content: "Balance — Registre" },
      { property: "og:description", content: "Balance générale des comptes." },
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
  const bal = trialBalance(lines.data ?? []);
  const rows = (accounts.data ?? []).filter((a) => bal.has(a.id));
  const tot = [...bal.values()].reduce((s, v) => ({ d: s.d + v.debit, c: s.c + v.credit }), { d: 0, c: 0 });

  return (
    <div>
      <PageHeader title="Balance générale" subtitle="Écritures validées uniquement." />
      <div className="mb-4 flex gap-3">
        <div className="grid gap-1"><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="grid gap-1"><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Compte</th><th className="px-3 py-2">Intitulé</th><th className="px-3 py-2 text-right">Débit</th><th className="px-3 py-2 text-right">Crédit</th><th className="px-3 py-2 text-right">Solde débiteur</th><th className="px-3 py-2 text-right">Solde créditeur</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-muted-foreground">{lines.isLoading ? "Chargement…" : "Aucun mouvement validé."}</td></tr>}
            {rows.map((a) => {
              const v = bal.get(a.id)!;
              const s = round2(v.debit - v.credit);
              return (
                <tr key={a.id} className="border-t border-border">
                  <td className="num px-3 py-2">{a.code}</td><td className="px-3 py-2">{a.name}</td>
                  <td className="num px-3 py-2 text-right">{formatEUR(v.debit)}</td>
                  <td className="num px-3 py-2 text-right">{formatEUR(v.credit)}</td>
                  <td className="num px-3 py-2 text-right">{s > 0 ? formatEUR(s) : ""}</td>
                  <td className="num px-3 py-2 text-right">{s < 0 ? formatEUR(-s) : ""}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-foreground font-semibold">
            <tr><td className="px-3 py-2" colSpan={2}>Total</td><td className="num px-3 py-2 text-right">{formatEUR(tot.d)}</td><td className="num px-3 py-2 text-right">{formatEUR(tot.c)}</td><td colSpan={2} /></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
