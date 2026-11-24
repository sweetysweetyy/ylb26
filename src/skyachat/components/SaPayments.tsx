import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { postPaymentToAccounting } from "@/skycomptable/lib/bridge";
import { PaymentEntryBadge, usePaymentEntries } from "@/skycomptable/components/PaymentEntryBadge";
import { formatMoney, type DocumentRow } from "@/skyachat/lib/doc";
import { Button } from "@/skyachat/components/ui/button";
import { Card } from "@/skyachat/components/ui/card";

type Pay = { id: string; amount: number; payment_date: string | null; payment_method: string | null; reference: string | null };
const METHOD: Record<string, string> = { transfer: "Virement", card: "Carte bancaire", check: "Chèque", cash: "Espèces", other: "Autre" };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

/** Règlements partiels d'une facture fournisseur, comptabilisés au journal BQ. */
export function SaPayments({ doc, onChange, onCount }: { doc: DocumentRow; onChange: (paidTotal: number, fullyPaid: boolean) => void; onCount?: (n: number) => void }) {
  const [list, setList] = useState<Pay[]>([]);
  const [form, setForm] = useState<{ amount: string; date: string; method: string; reference: string } | null>(null);
  const [pv, setPv] = useState(0);
  const entries = usePaymentEntries("skyachat_payment", list.map((p) => p.id), pv);
  const total = Number(doc.total_ttc) || 0;
  const paid = Math.round(list.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100;
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  const partner = (doc.contact as { company?: string } | null)?.company ?? "";

  const load = async () => {
    const { data } = await db().from("sa_payments").select("*").eq("document_id", doc.id).order("payment_date");
    setList((data as Pay[]) ?? []);
    onCount?.(((data as Pay[]) ?? []).length);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [doc.id]);

  const post = async (p: Pay) => {
    const r = await postPaymentToAccounting("skyachat", { id: p.id, amount: Number(p.amount), date: p.payment_date ?? new Date().toISOString().slice(0, 10), invoiceNumber: doc.number ?? null, partner });
    if (r.ok) toast.success(`Écriture ${r.number} créée en banque`); else toast.warning(`À comptabiliser : ${r.reason}`);
    setPv((v) => v + 1);
  };

  const submit = async () => {
    if (!form) return;
    const amount = Number(form.amount.replace(",", "."));
    if (!(amount > 0)) return void toast.error("Montant invalide");
    const { data, error } = await db().from("sa_payments").insert({
      document_id: doc.id, amount, payment_date: form.date, payment_method: form.method, reference: form.reference || null,
    }).select("*").single();
    if (error) return void toast.error(error.message);
    toast.success("Règlement enregistré");
    setForm(null);
    await post(data as Pay);
    const newPaid = Math.round((paid + amount) * 100) / 100;
    const fully = newPaid >= total - 0.005;
    if (fully && doc.status !== "paid") await supabase.from("sa_documents").update({ status: "paid" }).eq("id", doc.id);
    await load();
    onChange(newPaid, fully);
  };

  return (
    <Card className="mt-4 space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Règlements</h3>
        {remaining > 0 && !form && (
          <Button size="sm" onClick={() => setForm({ amount: String(remaining), date: new Date().toISOString().slice(0, 10), method: "transfer", reference: "" })}>
            <Wallet /> Enregistrer un règlement
          </Button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div><div className="text-muted-foreground">Total TTC</div>{formatMoney(total, doc.currency ?? "EUR")}</div>
        <div><div className="text-muted-foreground">Déjà payé</div>{formatMoney(paid, doc.currency ?? "EUR")}</div>
        <div><div className="text-muted-foreground">Reste à payer</div><b>{formatMoney(remaining, doc.currency ?? "EUR")}</b></div>
      </div>
      {form && (
        <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
          <label className="text-xs">Montant<input className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          <label className="text-xs">Date<input type="date" className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className="text-xs">Moyen
            <select className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs">Référence<input className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" placeholder="N° virement, chèque…" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></label>
          <div className="flex gap-2 sm:col-span-2"><Button size="sm" onClick={submit}>Valider</Button><Button size="sm" variant="ghost" onClick={() => setForm(null)}>Annuler</Button></div>
        </div>
      )}
      {list.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.payment_date ?? ""}</td>
                <td>{METHOD[p.payment_method ?? ""] ?? p.payment_method ?? ""}</td>
                <td>{p.reference ?? ""}</td>
                <td className="text-right">{formatMoney(Number(p.amount), doc.currency ?? "EUR")}</td>
                <td className="pl-2 text-right"><PaymentEntryBadge entry={entries[p.id]} onPost={() => post(p)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
