import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/skycomptable/lib/supabase";
import { canEdit, useCompany } from "@/skycomptable/lib/session";
import { PageHeader, selectCls, useTable } from "@/skycomptable/components/CrudTable";
import { Button } from "@/skycomptable/components/ui/button";
import { Input } from "@/skycomptable/components/ui/input";
import { Label } from "@/skycomptable/components/ui/label";
import { Badge } from "@/skycomptable/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/skycomptable/components/ui/dialog";
import { formatEUR } from "@/skycomptable/lib/accounting";
import {
  invoiceEntryLines, invoiceStatusAfterPayment, invoiceTotals, isCustomer, paymentEntryLines,
  type InvLine, type InvoiceType, type TaxInfo,
} from "@/skycomptable/lib/invoicing";
import { createPostedEntry, partnerAccount } from "@/skycomptable/lib/posting";

export const Route = createFileRoute("/_authenticated/skycomptable/factures")({
  head: () => ({
    meta: [
      { title: "Factures — Registre" },
      { name: "description", content: "Factures clients et fournisseurs, validation comptable et règlements." },
      { property: "og:title", content: "Factures — Registre" },
      { property: "og:description", content: "Factures clients et fournisseurs, validation comptable et règlements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type Invoice = {
  id: string; contact_id: string; journal_id: string; invoice_type: InvoiceType; status: string; invoice_number: string | null;
  supplier_reference: string | null; issue_date: string; due_date: string | null; subtotal: number; tax_total: number; total: number;
  accounting_entry_id: string | null;
};
type Account = { id: string; code: string; name: string };
type Journal = { id: string; code: string; name: string; journal_type: string; default_account_id: string | null };
type Contact = { id: string; display_name: string; is_customer: boolean; is_supplier: boolean };
type BankAccount = { id: string; journal_id: string; account_id: string; display_name: string };

const typeLabel: Record<InvoiceType, string> = {
  customer_invoice: "Facture client", customer_credit_note: "Avoir client", supplier_bill: "Facture fournisseur", supplier_credit_note: "Avoir fournisseur",
};
const statusLabel: Record<string, string> = { draft: "Brouillon", posted: "Validée", partially_paid: "Partiellement payée", paid: "Payée", cancelled: "Annulée" };
const methods = { bank_transfer: "Virement", card: "Carte", cash: "Espèces", cheque: "Chèque", direct_debit: "Prélèvement", other: "Autre" };
const today = () => new Date().toISOString().slice(0, 10);

function useRefs() {
  const accounts = useTable<Account>("skc_chart_accounts", "code");
  const skc_journals = useTable<Journal>("skc_journals", "code");
  const skc_contacts = useTable<Contact>("skc_contacts", "display_name");
  const taxes = useTable<TaxInfo & { code: string; name: string }>("skc_tax_rates", "code");
  const banks = useTable<BankAccount>("skc_bank_accounts", "display_name");
  const skc_payments = useTable<{ invoice_id: string; amount: number; status: string }>("skc_payments", "payment_date");
  return { accounts: accounts.data ?? [], skc_journals: skc_journals.data ?? [], skc_contacts: skc_contacts.data ?? [], taxes: taxes.data ?? [], banks: banks.data ?? [], skc_payments: skc_payments.data ?? [] };
}

function Page() {
  const { data: ctx } = useCompany();
  const editable = canEdit(ctx?.role);
  const qc = useQueryClient();
  const refs = useRefs();
  const [filter, setFilter] = useState<"all" | "customer" | "supplier">("all");
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const invoices = useTable<Invoice>("skc_invoice_documents", "issue_date");
  const contactName = new Map(refs.skc_contacts.map((c) => [c.id, c.display_name]));
  const paidBy = (id: string) => refs.skc_payments.filter((p) => p.invoice_id === id && p.status !== "cancelled").reduce((s, p) => s + Number(p.amount), 0);
  const refresh = () => ["skc_invoice_documents", "skc_invoice_lines", "skc_payments", "skc_accounting_entries", "ledger"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const list = (invoices.data ?? []).filter((i) => filter === "all" || (filter === "customer") === isCustomer(i.invoice_type)).reverse();

  async function post(inv: Invoice) {
    try {
      const { data: lines, error } = await supabase.from("skc_invoice_lines").select("*").eq("invoice_id", inv.id).order("line_number");
      if (error) throw error;
      const journal = refs.skc_journals.find((j) => j.id === inv.journal_id);
      if (!journal) throw new Error("Journal introuvable.");
      const label = `${typeLabel[inv.invoice_type]} ${contactName.get(inv.contact_id) ?? ""}`.trim();
      const genLines = invoiceEntryLines({
        type: inv.invoice_type, lines: lines as InvLine[], taxes: refs.taxes, contactId: inv.contact_id, label,
        partnerAccountId: partnerAccount(refs.accounts, isCustomer(inv.invoice_type)),
      });
      const entry = await createPostedEntry({
        companyId: ctx!.company.id, journalId: journal.id, journalCode: journal.code, date: inv.issue_date, description: label,
        reference: inv.supplier_reference, sourceType: "invoice", sourceId: inv.id, lines: genLines,
      });
      const { error: e2 } = await supabase.from("skc_invoice_documents")
        .update({ status: "posted", accounting_entry_id: entry.id, invoice_number: entry.number }).eq("id", inv.id);
      if (e2) throw e2;
      toast.success(`Facture validée — écriture ${entry.number}`);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(inv: Invoice) {
    if (!confirm("Supprimer ce brouillon ?")) return;
    await supabase.from("skc_invoice_lines").delete().eq("invoice_id", inv.id);
    const { error } = await supabase.from("skc_invoice_documents").delete().eq("id", inv.id);
    if (error) toast.error(error.message); else refresh();
  }

  return (
    <div>
      <PageHeader
        title="Factures"
        subtitle="Une facture validée génère son écriture comptable équilibrée. Comptes tiers : 411 (clients) et 401 (fournisseurs)."
        action={editable && <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> Nouvelle facture</Button>}
      />
      <div className="mb-3 flex gap-2">
        {(["all", "customer", "supplier"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "Toutes" : f === "customer" ? "Ventes" : "Achats"}
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">N°</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Tiers</th>
              <th className="px-3 py-2 text-right">TTC</th><th className="px-3 py-2 text-right">Réglé</th><th className="px-3 py-2">Statut</th><th /></tr>
          </thead>
          <tbody>
            {invoices.isLoading && <tr><td colSpan={8} className="px-3 py-6 text-muted-foreground">Chargement…</td></tr>}
            {invoices.error && <tr><td colSpan={8} className="px-3 py-6 text-destructive">{(invoices.error as Error).message}</td></tr>}
            {!invoices.isLoading && list.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-muted-foreground">Aucune facture pour l'instant.</td></tr>}
            {list.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="px-3 py-2">{i.issue_date}</td>
                <td className="num px-3 py-2">{i.invoice_number ?? "—"}</td>
                <td className="px-3 py-2">{typeLabel[i.invoice_type]}</td>
                <td className="px-3 py-2">{contactName.get(i.contact_id) ?? "—"}</td>
                <td className="num px-3 py-2 text-right">{formatEUR(i.total)}</td>
                <td className="num px-3 py-2 text-right">{formatEUR(paidBy(i.id))}</td>
                <td className="px-3 py-2">
                  <Badge variant={i.status === "draft" ? "outline" : i.status === "paid" ? "secondary" : "default"}>{statusLabel[i.status]}</Badge>
                </td>
                <td className="space-x-1 whitespace-nowrap px-2 py-1 text-right">
                  {editable && i.status === "draft" && <>
                    <Button size="sm" onClick={() => post(i)}>Valider</Button>
                    <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
                  </>}
                  {editable && (i.status === "posted" || i.status === "partially_paid") && <Button size="sm" variant="outline" onClick={() => setPaying(i)}>Règlement</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && <InvoiceForm refs={refs} onClose={() => setCreating(false)} onSaved={refresh} />}
      {paying && <PaymentForm inv={paying} refs={refs} already={paidBy(paying.id)} label={`Règlement ${paying.invoice_number ?? ""} ${contactName.get(paying.contact_id) ?? ""}`}
        onClose={() => setPaying(null)} onSaved={refresh} />}
    </div>
  );
}

type Refs = ReturnType<typeof useRefs>;
const emptyLine = (): InvLine => ({ description: "", quantity: 1, unit_price: 0, account_id: "", tax_rate_id: null });

function InvoiceForm({ refs, onClose, onSaved }: { refs: Refs; onClose: () => void; onSaved: () => void }) {
  const { data: ctx } = useCompany();
  const [type, setType] = useState<InvoiceType>("customer_invoice");
  const customer = isCustomer(type);
  const skc_journals = refs.skc_journals.filter((j) => j.journal_type === (customer ? "sales" : "purchases"));
  const [journalId, setJournalId] = useState("");
  const [contactId, setContactId] = useState("");
  const [issue, setIssue] = useState(today());
  const [due, setDue] = useState("");
  const [ref, setRef] = useState("");
  const [lines, setLines] = useState<InvLine[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const totals = invoiceTotals(lines, refs.taxes);
  const accounts = refs.accounts.filter((a) => a.code.startsWith(customer ? "7" : "6") || a.code.startsWith("2"));
  const taxes = refs.taxes.filter((t) => (t as { applies_to?: string }).applies_to !== (customer ? "purchases" : "sales"));
  const skc_contacts = refs.skc_contacts.filter((c) => (customer ? c.is_customer : c.is_supplier));
  const setLine = (i: number, p: Partial<InvLine>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...p } : l)));

  async function save() {
    const jid = journalId || skc_journals[0]?.id;
    if (!jid) { toast.error(`Créez d'abord un journal de type ${customer ? "Ventes" : "Achats"}.`); return; }
    if (!contactId) { toast.error("Choisissez un tiers."); return; }
    const filled = lines.filter((l) => l.description && l.account_id);
    if (!filled.length) { toast.error("Ajoutez au moins une ligne avec un libellé et un compte."); return; }
    setBusy(true);
    const id = crypto.randomUUID();
    const companyId = ctx!.company.id;
    const t = invoiceTotals(filled, refs.taxes);
    const { error } = await supabase.from("skc_invoice_documents").insert({
      id, company_id: companyId, contact_id: contactId, journal_id: jid, invoice_type: type, issue_date: issue, due_date: due || null,
      supplier_reference: ref || null, subtotal: t.subtotal, tax_total: t.tax, total: t.total,
    });
    if (!error) {
      const { error: e2 } = await supabase.from("skc_invoice_lines").insert(filled.map((l, i) => {
        const sub = Math.round(l.quantity * l.unit_price * 100) / 100;
        const rate = refs.taxes.find((x) => x.id === l.tax_rate_id)?.rate_percent ?? 0;
        return { company_id: companyId, invoice_id: id, line_number: i + 1, description: l.description, quantity: l.quantity, unit_price: l.unit_price,
          account_id: l.account_id, tax_rate_id: l.tax_rate_id, line_subtotal: sub, line_tax: Math.round(sub * Number(rate)) / 100 };
      }));
      if (e2) { await supabase.from("skc_invoice_documents").delete().eq("id", id); toast.error(e2.message); }
      else { toast.success("Brouillon enregistré"); onSaved(); onClose(); }
    } else toast.error(error.message);
    setBusy(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvelle facture</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1"><Label>Type</Label>
            <select className={selectCls} value={type} onChange={(e) => { setType(e.target.value as InvoiceType); setJournalId(""); setContactId(""); }}>
              {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="grid gap-1"><Label>Journal</Label>
            <select className={selectCls} value={journalId || skc_journals[0]?.id || ""} onChange={(e) => setJournalId(e.target.value)}>
              {skc_journals.length === 0 && <option value="">Aucun journal {customer ? "de ventes" : "d'achats"}</option>}
              {skc_journals.map((j) => <option key={j.id} value={j.id}>{j.code} — {j.name}</option>)}
            </select></div>
          <div className="grid gap-1"><Label>Tiers</Label>
            <select className={selectCls} value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">—</option>
              {skc_contacts.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select></div>
          <div className="grid gap-1"><Label>Date</Label><Input type="date" value={issue} onChange={(e) => setIssue(e.target.value)} /></div>
          <div className="grid gap-1"><Label>Échéance</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div className="grid gap-1"><Label>Réf. fournisseur / pièce</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} /></div>
        </div>
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th>Libellé</th><th>Compte</th><th className="w-16">Qté</th><th className="w-24">PU HT</th><th>TVA</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="pr-1"><Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} /></td>
                <td className="pr-1"><select className={selectCls} value={l.account_id} onChange={(e) => setLine(i, { account_id: e.target.value })}>
                  <option value="">—</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></td>
                <td className="pr-1"><Input type="number" value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} /></td>
                <td className="pr-1"><Input type="number" step="0.01" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: Number(e.target.value) })} /></td>
                <td className="pr-1"><select className={selectCls} value={l.tax_rate_id ?? ""} onChange={(e) => setLine(i, { tax_rate_id: e.target.value || null })}>
                  <option value="">Sans TVA</option>{taxes.map((t) => <option key={t.id} value={t.id}>{t.code} ({t.rate_percent} %)</option>)}</select></td>
                <td><Button size="icon" variant="ghost" aria-label="Retirer" onClick={() => setLines(lines.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setLines([...lines, emptyLine()])}><Plus className="mr-1 h-4 w-4" /> Ligne</Button>
        <div className="num text-right text-sm">HT {formatEUR(totals.subtotal)} · TVA {formatEUR(totals.tax)} · <strong>TTC {formatEUR(totals.total)}</strong></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button disabled={busy} onClick={save}>Enregistrer le brouillon</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({ inv, refs, already, label, onClose, onSaved }: { inv: Invoice; refs: Refs; already: number; label: string; onClose: () => void; onSaved: () => void }) {
  const { data: ctx } = useCompany();
  const [bankId, setBankId] = useState(refs.banks[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState(Math.round((Number(inv.total) - already) * 100) / 100);
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const journalsQ = useQuery({ queryKey: ["noop"], queryFn: () => null, enabled: false });
  void journalsQ;

  async function save() {
    const bank = refs.banks.find((b) => b.id === bankId);
    if (!bank) { toast.error("Créez d'abord un compte bancaire (page Banque)."); return; }
    const journal = refs.skc_journals.find((j) => j.id === bank.journal_id);
    if (!journal) { toast.error("Journal du compte bancaire introuvable."); return; }
    setBusy(true);
    try {
      const paymentId = crypto.randomUUID();
      const entry = await createPostedEntry({
        companyId: ctx!.company.id, journalId: journal.id, journalCode: journal.code, date, description: label.trim(), reference: reference || inv.invoice_number,
        sourceType: "payment", sourceId: paymentId,
        lines: paymentEntryLines({ type: inv.invoice_type, amount, bankAccountId: bank.account_id, contactId: inv.contact_id, label: label.trim(),
          partnerAccountId: partnerAccount(refs.accounts, isCustomer(inv.invoice_type)) }),
      });
      const { error } = await supabase.from("skc_payments").insert({
        id: paymentId, company_id: ctx!.company.id, invoice_id: inv.id, accounting_entry_id: entry.id, payment_date: date, amount,
        payment_method: method, reference: reference || null,
      });
      if (error) throw error;
      await supabase.from("skc_invoice_documents").update({ status: invoiceStatusAfterPayment(Number(inv.total), already + amount) }).eq("id", inv.id);
      toast.success(`Règlement enregistré — écriture ${entry.number}`);
      onSaved(); onClose();
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Règlement de {inv.invoice_number}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label>Compte bancaire</Label>
            <select className={selectCls} value={bankId} onChange={(e) => setBankId(e.target.value)}>
              {refs.banks.length === 0 && <option value="">Aucun compte bancaire</option>}
              {refs.banks.map((b) => <option key={b.id} value={b.id}>{b.display_name}</option>)}
            </select></div>
          <div className="grid gap-1"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid gap-1"><Label>Montant (reste {formatEUR(Number(inv.total) - already)})</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div className="grid gap-1"><Label>Mode</Label>
            <select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(methods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="grid gap-1"><Label>Référence</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button disabled={busy} onClick={save}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
