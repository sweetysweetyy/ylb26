import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/skycomptable/lib/supabase";
import { canEdit, useCompany } from "@/skycomptable/lib/session";
import { PageHeader, selectCls, useTable } from "@/skycomptable/components/CrudTable";
import { Button } from "@/skycomptable/components/ui/button";
import { Input } from "@/skycomptable/components/ui/input";
import { Label } from "@/skycomptable/components/ui/label";
import { Badge } from "@/skycomptable/components/ui/badge";
import { formatEUR, round2 } from "@/skycomptable/lib/accounting";
import { parseBankCsv } from "@/skycomptable/lib/invoicing";

export const Route = createFileRoute("/_authenticated/skycomptable/banque")({
  head: () => ({
    meta: [
      { title: "Banque — Registre" },
      { name: "description", content: "Comptes bancaires, import de relevés et rapprochement." },
      { property: "og:title", content: "Banque — Registre" },
      { property: "og:description", content: "Comptes bancaires, import de relevés et rapprochement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type BankAccount = { id: string; journal_id: string; account_id: string; display_name: string };
type Tx = { id: string; bank_account_id: string; transaction_date: string; description: string; amount: number; status: string; matched_entry_line_id: string | null };
type Line = { id: string; label: string; debit: number; credit: number; skc_accounting_entries: { entry_date: string; entry_number: string | null; status: string } };

function Page() {
  const { data: ctx } = useCompany();
  const editable = canEdit(ctx?.role);
  const companyId = ctx?.company.id;
  const qc = useQueryClient();
  const banks = useTable<BankAccount>("skc_bank_accounts", "display_name");
  const accounts = useTable<{ id: string; code: string; name: string }>("skc_chart_accounts", "code");
  const skc_journals = useTable<{ id: string; code: string; name: string; journal_type: string }>("skc_journals", "code");
  const [bankId, setBankId] = useState("");
  const bank = banks.data?.find((b) => b.id === (bankId || banks.data?.[0]?.id));
  const txs = useTable<Tx>("skc_bank_transactions", "transaction_date");
  const lines = useQuery({
    queryKey: ["bank-lines", companyId, bank?.account_id],
    enabled: !!bank,
    queryFn: async () => {
      const { data, error } = await supabase.from("skc_accounting_entry_lines")
        .select("id, label, debit, credit, skc_accounting_entries!inner(entry_date, entry_number, status)")
        .eq("company_id", companyId!).eq("account_id", bank!.account_id).eq("skc_accounting_entries.status", "posted");
      if (error) throw error;
      return data as unknown as Line[];
    },
  });
  const [form, setForm] = useState({ display_name: "", journal_id: "", account_id: "" });
  const [selected, setSelected] = useState<string | null>(null);

  const bankTx = (txs.data ?? []).filter((t) => t.bank_account_id === bank?.id).reverse();
  const usedLines = new Set((txs.data ?? []).map((t) => t.matched_entry_line_id).filter(Boolean));
  const openLines = (lines.data ?? []).filter((l) => !usedLines.has(l.id));
  const sel = bankTx.find((t) => t.id === selected);
  const candidates = sel ? openLines.filter((l) => round2(Number(l.debit) - Number(l.credit)) === round2(Number(sel.amount))) : [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["skc_bank_transactions"] }); qc.invalidateQueries({ queryKey: ["skc_bank_accounts"] }); };

  async function addBank(e: React.FormEvent) {
    e.preventDefault();
    if (!form.display_name || !form.journal_id || !form.account_id) { toast.error("Nom, journal et compte requis."); return; }
    const { error } = await supabase.from("skc_bank_accounts").insert({ ...form, company_id: companyId });
    if (error) toast.error(error.message); else { toast.success("Compte bancaire ajouté"); setForm({ display_name: "", journal_id: "", account_id: "" }); refresh(); }
  }

  async function importFile(file: File) {
    if (!bank) return;
    const rows = parseBankCsv(await file.text());
    if (!rows.length) { toast.error("Aucune ligne reconnue (format attendu : date;libellé;montant)."); return; }
    const { error, count } = await supabase.from("skc_bank_transactions").upsert(
      rows.map((r) => ({ company_id: companyId, bank_account_id: bank.id, external_transaction_id: r.external_id, transaction_date: r.date, description: r.description, amount: r.amount })),
      { onConflict: "company_id,bank_account_id,external_transaction_id", ignoreDuplicates: true, count: "exact" },
    );
    if (error) toast.error(error.message);
    else { toast.success(`${count ?? 0} nouvelle(s) ligne(s) importée(s) sur ${rows.length} — doublons ignorés.`); refresh(); }
  }

  async function setTx(id: string, patch: Partial<Tx>) {
    const { error } = await supabase.from("skc_bank_transactions").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { setSelected(null); refresh(); }
  }

  return (
    <div>
      <PageHeader title="Banque & rapprochement" subtitle="Importez un relevé CSV (date;libellé;montant) puis rapprochez chaque ligne d'une écriture validée du compte de banque." />

      {editable && (
        <form onSubmit={addBank} className="mb-6 grid items-end gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-4">
          <div className="grid gap-1"><Label>Nouveau compte bancaire</Label><Input placeholder="Ex. Banque principale" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Journal</Label>
            <select className={selectCls} value={form.journal_id} onChange={(e) => setForm({ ...form, journal_id: e.target.value })}>
              <option value="">—</option>{(skc_journals.data ?? []).filter((j) => j.journal_type === "bank" || j.journal_type === "cash").map((j) => <option key={j.id} value={j.id}>{j.code} — {j.name}</option>)}
            </select></div>
          <div className="grid gap-1"><Label>Compte (512…)</Label>
            <select className={selectCls} value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              <option value="">—</option>{(accounts.data ?? []).filter((a) => a.code.startsWith("5")).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select></div>
          <Button className="w-fit"><Plus className="mr-1 h-4 w-4" /> Ajouter</Button>
        </form>
      )}

      {(banks.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Aucun compte bancaire pour l'instant.</p> : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="grid gap-1"><Label>Compte</Label>
              <select className={selectCls} value={bank?.id ?? ""} onChange={(e) => { setBankId(e.target.value); setSelected(null); }}>
                {banks.data!.map((b) => <option key={b.id} value={b.id}>{b.display_name}</option>)}
              </select></div>
            {editable && <div className="grid gap-1"><Label htmlFor="csv">Importer un relevé CSV</Label>
              <Input id="csv" type="file" accept=".csv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} /></div>}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-md border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Libellé</th><th className="px-3 py-2 text-right">Montant</th><th className="px-3 py-2">Statut</th></tr></thead>
                <tbody>
                  {bankTx.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-muted-foreground">Aucun mouvement importé.</td></tr>}
                  {bankTx.map((t) => (
                    <tr key={t.id} onClick={() => t.status === "unmatched" && setSelected(t.id)}
                      className={`border-t border-border ${t.status === "unmatched" ? "cursor-pointer hover:bg-muted/50" : ""} ${selected === t.id ? "bg-accent" : ""}`}>
                      <td className="px-3 py-2">{t.transaction_date}</td><td className="px-3 py-2">{t.description}</td>
                      <td className="num px-3 py-2 text-right">{formatEUR(t.amount)}</td>
                      <td className="px-3 py-2">
                        {t.status === "matched" ? <Badge>Rapproché</Badge> : t.status === "ignored" ? <Badge variant="secondary">Ignoré</Badge> : <Badge variant="outline">À rapprocher</Badge>}
                        {editable && t.status !== "unmatched" && <button className="ml-2 text-xs underline" onClick={(e) => { e.stopPropagation(); setTx(t.id, { status: "unmatched", matched_entry_line_id: null }); }}>annuler</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-md border border-border bg-card p-3 text-sm">
              {!sel ? <p className="text-muted-foreground">Sélectionnez un mouvement « À rapprocher » pour voir les écritures de même montant.</p> : (
                <>
                  <p className="mb-2 font-medium">{sel.description} — {formatEUR(sel.amount)}</p>
                  {candidates.length === 0 && <p className="text-muted-foreground">Aucune écriture validée de même montant sur ce compte. Enregistrez le règlement (page Factures) ou une écriture, puis revenez.</p>}
                  {candidates.map((l) => (
                    <div key={l.id} className="flex items-center justify-between border-t border-border py-2">
                      <span>{l.skc_accounting_entries.entry_date} · {l.skc_accounting_entries.entry_number} · {l.label}</span>
                      {editable && <Button size="sm" onClick={() => setTx(sel.id, { status: "matched", matched_entry_line_id: l.id })}>Rapprocher</Button>}
                    </div>
                  ))}
                  {editable && <Button size="sm" variant="ghost" className="mt-2" onClick={() => setTx(sel.id, { status: "ignored" })}>Ignorer ce mouvement</Button>}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
