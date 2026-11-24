import { postPaymentToAccounting } from "@/skycomptable/lib/bridge";
import { PaymentEntryBadge, usePaymentEntries } from "@/skycomptable/components/PaymentEntryBadge";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Download, Link2, Lock, Mail, Plus, Save, Trash2, Undo2, Wallet } from "lucide-react";
import { DocumentEmailDialog } from "@/sendy/components/DocumentEmailDialog";
import { buildSkyventePdf, saveBlob } from "@/skyvente/lib/pdf";
import { eur, fdate } from "@/skyvente/lib/calc";
import { issuerName } from "@/skyvente/lib/compliance";

type Payment = { id: string; amount: number; payment_date: string; payment_method: string; reference: string | null };
import { toast } from "sonner";
import { Button } from "@/skyvente/components/ui/button";
import { Badge } from "@/skyvente/components/ui/badge";
import { Field } from "@/skyvente/components/AppShell";
import { DocBreadcrumb } from "@/skyvente/components/DocBreadcrumb";
import { ScaledPreview } from "@/skyvente/components/DocumentPreview";
import { sb } from "@/skyvente/lib/supabase";
import { uid } from "@/skyvente/lib/calc";
import { DocHistory, logHistory } from "@/skyvente/lib/history";
import { convertDocument, NEXT_STEP, serviceToItem, totalsFor } from "@/skyvente/lib/docs";
import { loadSettings } from "@/skyvente/lib/settings";
import type { Doc, LineItem, Service, Settings } from "@/skyvente/lib/types";
import { DOC_LABEL, STATUS_LABEL } from "@/skyvente/lib/types";
import { AccountingBadge, autoPost } from "@/skycomptable/components/AccountingBadge";
import { sfPrepare } from "@/skyfacturation/lib/gateway.functions";

export const Route = createFileRoute("/_authenticated/skyvente/documents/$id")({ component: Editor });

function Editor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [chain, setChain] = useState<Doc[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payForm, setPayForm] = useState<{ amount: string; date: string; method: string; reference: string } | null>(null);
  const [mailOpen, setMailOpen] = useState(false);
  const [hv, setHv] = useState(0);
  const [pv, setPv] = useState(0);
  const payEntries = usePaymentEntries("skyvente_payment", payments.map((p) => p.id), pv);

  useEffect(() => {
    sb().from("sv_documents").select("*").eq("id", id).single().then(({ data }) => {
      const d = data as Doc;
      setDoc(d);
      if (d?.root_id) sb().from("sv_documents").select("*").eq("root_id", d.root_id).then(({ data: c }) => setChain((c as Doc[]) || []));
    });
    loadSettings().then(setSettings);
    sb().from("sv_services").select("*").order("name").then(({ data }) => setServices((data as Service[]) || []));
    loadPayments();
  }, [id]);

  function loadPayments() {
    sb().from("sv_payments").select("*").eq("document_id", id).order("payment_date").then(({ data }) => setPayments((data as Payment[]) || []));
  }

  const log = (label: string) => doc && logHistory(doc.id, label).then(() => setHv((v) => v + 1));
  if (!doc || !settings) return <div className="text-muted-foreground">Chargement…</div>;
  const fiscal = doc.type === "invoice" || doc.type === "credit_note";
  const locked = fiscal && doc.status !== "draft";
  const creditNote = async () => {
    if (!confirm("Créer un avoir annulant cette facture ?")) return;
    const { data, error } = await sb().rpc("sv_create_credit_note", { p_invoice: doc.id });
    if (error) return void toast.error(error.message);
    void log(`Avoir ${(data as Doc).number ?? ""} créé`);
    toast.success("Avoir créé");
    navigate({ to: "/skyvente/documents/$id", params: { id: (data as Doc).id } });
  };
  const paidTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Math.round((Number(doc.total_ttc) - paidTotal) * 100) / 100);
  const openPay = () => setPayForm({ amount: String(remaining), date: new Date().toISOString().slice(0, 10), method: "transfer", reference: "" });
  const submitPay = async () => {
    if (!payForm) return;
    const amount = Number(payForm.amount.replace(",", "."));
    if (!(amount > 0)) return void toast.error("Montant invalide");
    const { error } = await sb().rpc("sv_register_payment", {
      p_document_id: doc.id, p_amount: amount, p_date: payForm.date, p_method: payForm.method, p_reference: payForm.reference || null,
    });
    if (error) return void toast.error(error.message);
    void log(`Paiement de ${eur(amount)} enregistré`);
    toast.success("Paiement enregistré");
    setPayForm(null);
    const { data: last } = await sb().from("sv_payments").select("id, amount, payment_date").eq("document_id", doc.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (last) {
      const r = await postPaymentToAccounting("skyvente", { id: last.id, amount: Number(last.amount), date: last.payment_date ?? payForm.date, invoiceNumber: doc.number ?? null, partner: (doc.client as { name?: string; company?: string } | null)?.company || (doc.client as { name?: string } | null)?.name || "" });
      if (r.ok) toast.success(`Écriture ${r.number} créée en banque`); else toast.warning(`À comptabiliser : ${r.reason}`);
    }
    loadPayments();
    setPv((v) => v + 1);
    const { data } = await sb().from("sv_documents").select("*").eq("id", doc.id).single();
    if (data) setDoc(data as Doc);
  };
  const postPay = async (p: Payment) => {
    const r = await postPaymentToAccounting("skyvente", { id: p.id, amount: Number(p.amount), date: p.payment_date ?? new Date().toISOString().slice(0, 10), invoiceNumber: doc.number ?? null, partner: (doc.client as { name?: string; company?: string } | null)?.company || (doc.client as { name?: string } | null)?.name || "" });
    if (r.ok) toast.success(`Écriture ${r.number} créée en banque`); else toast.error(r.reason);
    setPv((v) => v + 1);
  };
  const up = (p: Partial<Doc>) => setDoc({ ...doc, ...p });
  const upItem = (i: number, p: Partial<LineItem>) => up({ items: doc.items.map((it, j) => (j === i ? { ...it, ...p } : it)) });
  const upClient = (k: string, v: string) => up({ client: { ...doc.client, [k]: v } });

  const save = async (extra: Partial<Doc> = {}) => {
    const d = { ...doc, ...extra };
    const t = totalsFor(d.items, d.global_discount, settings);
    const { error } = await sb().from("sv_documents").update({
      status: d.status, title: d.title, client: d.client, items: d.items, issue_date: d.issue_date,
      due_date: d.due_date, intro: d.intro, notes: d.notes, terms: d.terms, global_discount: d.global_discount,
      total_ht: t.total_ht, total_vat: t.total_vat, total_ttc: t.total_ttc,
    }).eq("id", d.id);
    if (error) { toast.error(error.message); return false; }
    setDoc(d);
    await log(d.status !== doc.status ? `Modifié — statut : ${STATUS_LABEL[d.status] ?? d.status}` : "Modification enregistrée");
    toast.success("Enregistré");
    return true;
  };

  const convert = async () => {
    const next = NEXT_STEP[doc.type]!;
    if (!(await save())) return;
    try {
      const n = await convertDocument(doc, next, settings);
      await log(`Converti en ${DOC_LABEL[next]} ${n.number ?? ""}`.trim());
      toast.success(`${DOC_LABEL[next]} créé`);
      navigate({ to: "/skyvente/documents/$id", params: { id: n.id } });
    } catch (e) { toast.error((e as Error).message); }
  };

  const finalize = async () => {
    if (!confirm("Valider définitivement la facture ? Elle ne sera plus modifiable.")) return;
    if (!(await save())) return;
    const { data, error } = await sb().rpc("sv_finalize_invoice", { p_id: doc.id });
    if (error) return void toast.error(error.message);
    setDoc(data as Doc);
    void log(`Validée — n° ${(data as Doc).number ?? ""}`);
    toast.success("Facture validée");
    const f = data as Doc;
    await autoPost("skyvente", { id: f.id, type: f.type, number: f.number, issue_date: f.issue_date, total_ht: f.total_ht, total_vat: f.total_vat, total_ttc: f.total_ttc, partner: f.client?.name ?? "" });
    setHv((v) => v + 1);
  };

  const del = async () => {
    if (!confirm("Supprimer ce document ?")) return;
    const { error } = await sb().from("sv_documents").delete().eq("id", doc.id);
    if (error) return void toast.error(error.message);
    navigate({ to: "/skyvente/documents" });
  };

  const signLink = `${window.location.origin}/skyvente-sign/${doc.sign_token}`;
  const needsSign = (doc.type === "quote" || doc.type === "order" || doc.type === "delivery") && !doc.signature && !!doc.sign_token;
  const company = issuerName(settings.company);
  const mailVars = {
    numero: doc.number ?? "", type: DOC_LABEL[doc.type], contact: doc.client?.contact_name || doc.client?.name || "",
    client: doc.client?.name ?? "", societe: company, montant: eur(doc.total_ttc), echeance: doc.due_date ? fdate(doc.due_date) : "", objet: doc.title ?? "",
  };
  const defaultSubject = `[${DOC_LABEL[doc.type]} ${doc.number ?? "brouillon"}] ${
    doc.type === "quote" ? "Proposition commerciale" : doc.type === "invoice" ? (doc.due_date ? `Échéance au ${fdate(doc.due_date)}` : "Votre facture")
    : doc.type === "order" ? "Confirmation de commande" : doc.type === "delivery" ? "Livraison" : "Votre avoir"
  } - ${company}`;
  const mailFacts = [
    `Document : ${DOC_LABEL[doc.type]} ${doc.number ?? "(brouillon)"}`, doc.title && `Objet : ${doc.title}`,
    `Client : ${doc.client?.name ?? ""}${doc.client?.contact_name ? ` (contact : ${doc.client.contact_name})` : ""}`,
    `Émetteur : ${company}`, `Montant TTC : ${eur(doc.total_ttc)}`, `Date : ${fdate(doc.issue_date)}`,
    doc.due_date && `${doc.type === "quote" ? "Valable jusqu'au" : "Échéance"} : ${fdate(doc.due_date)}`,
    doc.terms && `Conditions : ${doc.terms}`, needsSign && `Lien de signature en ligne : ${signLink}`,
  ].filter(Boolean).join("\n");
  const onMailSent = async () => {
    void log("Envoyé par e-mail");
    if (fiscal || doc.status !== "draft") return;
    const { error } = await sb().from("sv_documents").update({ status: "sent" }).eq("id", doc.id);
    if (!error) setDoc({ ...doc, status: "sent" });
  };
  const statuses = fiscal ? (locked ? ["final", "paid"] : ["draft"]) : ["draft", "sent", "accepted", "signed", "refused", "cancelled"];

  return (
    <div>
      <DocBreadcrumb chain={chain} current={doc} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{DOC_LABEL[doc.type]} {doc.number ?? "— brouillon"}</h1>
          <div className="mt-1 flex gap-2"><Badge variant="live">Aperçu en direct</Badge>{locked && <Badge variant="outline"><Lock className="mr-1 size-3" />Verrouillée</Badge>}{locked && <AccountingBadge source="skyvente" refreshKey={hv} doc={{ id: doc.id, type: doc.type, number: doc.number, issue_date: doc.issue_date, total_ht: doc.total_ht, total_vat: doc.total_vat, total_ttc: doc.total_ttc, partner: doc.client?.name ?? "" }} />}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked && <Button variant="glass" onClick={() => save()}><Save /> Enregistrer</Button>}
          <Button variant="glass" onClick={async () => { try { const { blob, filename } = await buildSkyventePdf(doc, settings, needsSign ? signLink : undefined); await saveBlob(blob, filename); void log("PDF téléchargé"); } catch (e) { toast.error((e as Error).message); } }}><Download /> PDF</Button>
          <Button variant="glass" onClick={async () => { if (locked || (await save())) setMailOpen(true); }}><Mail /> Envoyer par e-mail</Button>
          <DocumentEmailDialog
            open={mailOpen} onOpenChange={setMailOpen} app="skyvente" docId={doc.id} docType={doc.type} docLabel={DOC_LABEL[doc.type]}
            docNumber={doc.number} recipient={doc.client?.email ?? ""} defaultSubject={defaultSubject} vars={mailVars} facts={mailFacts}
            getPdf={() => buildSkyventePdf(doc, settings, needsSign ? signLink : undefined)} onSent={onMailSent}
          />
          {!fiscal && (
            <Button variant="glass" onClick={() => { navigator.clipboard.writeText(signLink); toast.success("Lien de signature copié"); }}><Link2 /> Lien signature</Button>
          )}
          {fiscal && !locked && <Button variant="holo" onClick={finalize}><Lock /> {doc.type === "credit_note" ? "Valider l'avoir" : "Valider la facture"}</Button>}
          {locked && remaining > 0 && <Button variant="holo" onClick={openPay}><Wallet /> Enregistrer un paiement</Button>}
          {doc.type === "invoice" && locked && <Button variant="glass" onClick={creditNote}><Undo2 /> Créer un avoir</Button>}
          {locked && (doc.type === "invoice" || doc.type === "credit_note") && <Button variant="glass" onClick={async () => { try { const r = await sfPrepare({ data: { source_app: "skyvente", doc_id: doc.id } }); await log("Transmis à Sky Facturation"); navigate({ to: "/skyfacturation/$id", params: { id: r.id } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Transmission impossible"); } }}><ArrowRight /> Transmettre à Sky Facturation</Button>}
          {NEXT_STEP[doc.type] && (doc.type !== "invoice" || locked) && (
            <Button variant="holo" onClick={convert}>{doc.type === "invoice" ? "Générer le livrable" : `Transformer en ${DOC_LABEL[NEXT_STEP[doc.type]!].toLowerCase()}`} <ArrowRight /></Button>
          )}
          {!locked && <Button variant="ghost" onClick={del}><Trash2 /></Button>}
        </div>
      </div>
      {payForm && (
        <div className="sv-bento mb-4 grid gap-3 p-5 sm:grid-cols-5 items-end">
          <Field label="Montant (€)"><input className="sv-field" inputMode="decimal" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className="sv-field" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} /></Field>
          <Field label="Mode">
            <select className="sv-field" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
              <option value="transfer">Virement</option><option value="card">Carte bancaire</option><option value="check">Chèque</option><option value="cash">Espèces</option><option value="other">Autre</option>
            </select>
          </Field>
          <Field label="Référence"><input className="sv-field" placeholder="N° virement, chèque…" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} /></Field>
          <div className="flex gap-2"><Button variant="holo" onClick={submitPay}>Valider</Button><Button variant="ghost" onClick={() => setPayForm(null)}>Annuler</Button></div>
        </div>
      )}
      {payments.length > 0 && (
        <div className="sv-bento mb-4 p-5">
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
            <h3 className="font-bold">Règlements</h3>
            <span>Payé {eur(paidTotal)} · Reste {eur(remaining)}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2">{p.payment_date ?? ""}</td>
                  <td>{p.payment_method ?? ""}</td>
                  <td>{p.reference ?? ""}</td>
                  <td className="text-right">{eur(Number(p.amount))}</td>
                  <td className="pl-3 text-right"><PaymentEntryBadge entry={payEntries[p.id]} onPost={() => postPay(p)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mb-4 text-xs text-muted-foreground">Astuce PDF : dans la fenêtre d'impression, choisissez « Enregistrer au format PDF » et désactivez « En-têtes et pieds de page ».</p>

      <div className="grid gap-6 2xl:grid-cols-[1fr_auto]">
        <fieldset disabled={locked} className="space-y-4">
          <div className="sv-bento grid gap-3 p-5 sm:grid-cols-3">
            <Field label="Statut">
              <select className="sv-field" value={doc.status} onChange={(e) => up({ status: e.target.value })}>
                {statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Date"><input type="date" className="sv-field" value={doc.issue_date} onChange={(e) => up({ issue_date: e.target.value })} /></Field>
            <Field label={doc.type === "quote" ? "Validité" : "Échéance"}><input type="date" className="sv-field" value={doc.due_date ?? ""} onChange={(e) => up({ due_date: e.target.value || null })} /></Field>
            <Field label="Objet" className="sm:col-span-3"><input className="sv-field" value={doc.title ?? ""} onChange={(e) => up({ title: e.target.value })} /></Field>
          </div>
          <div className="sv-bento grid gap-3 p-5 sm:grid-cols-2">
            <h3 className="font-bold sm:col-span-2">Client</h3>
            {(["name", "contact_name", "email", "phone", "address", "zip", "city", "country", "siret", "vat_number"] as const).map((k) => (
              <Field key={k} label={{ name: "Nom / Société", contact_name: "Interlocuteur", email: "E-mail", phone: "Téléphone", address: "Adresse", zip: "Code postal", city: "Ville", country: "Pays", siret: "SIRET", vat_number: "TVA" }[k]}>
                <input className="sv-field" value={doc.client[k] ?? ""} onChange={(e) => upClient(k, e.target.value)} />
              </Field>
            ))}
          </div>
          <div className="sv-bento space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">Prestations</h3>
              <div className="flex gap-2">
                <select className="sv-field w-56" value="" onChange={(e) => { const s = services.find((x) => x.id === e.target.value); if (s) up({ items: [...doc.items, serviceToItem(s)] }); }}>
                  <option value="">+ Depuis le catalogue</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Button size="sm" variant="glass" type="button" onClick={() => up({ items: [...doc.items, { id: uid(), name: "Nouvelle ligne", quantity: 1, unit: "unité", unit_price: 0, vat_rate: 20, discount: 0 }] })}><Plus /> Ligne libre</Button>
              </div>
            </div>
            {doc.items.map((it, i) => (
              <div key={it.id} className="grid grid-cols-6 gap-2 rounded-xl border p-3">
                <input className="sv-field col-span-5" value={it.name} onChange={(e) => upItem(i, { name: e.target.value })} />
                <Button size="icon" variant="ghost" type="button" onClick={() => up({ items: doc.items.filter((_, j) => j !== i) })}><Trash2 /></Button>
                <textarea rows={2} className="sv-field col-span-6" placeholder="Description" value={it.description ?? ""} onChange={(e) => upItem(i, { description: e.target.value })} />
                <Field label="Qté"><input type="number" step="0.01" className="sv-field" value={it.quantity} onChange={(e) => upItem(i, { quantity: Number(e.target.value) })} /></Field>
                <Field label="Unité"><input className="sv-field" value={it.unit} onChange={(e) => upItem(i, { unit: e.target.value })} /></Field>
                <Field label="PU HT"><input type="number" step="0.01" className="sv-field" value={it.unit_price} onChange={(e) => upItem(i, { unit_price: Number(e.target.value) })} /></Field>
                <Field label="TVA %"><input type="number" step="0.1" className="sv-field" value={it.vat_rate} onChange={(e) => upItem(i, { vat_rate: Number(e.target.value) })} /></Field>
                <Field label="Remise %"><input type="number" className="sv-field" value={it.discount} onChange={(e) => upItem(i, { discount: Number(e.target.value) })} /></Field>
              </div>
            ))}
            <Field label="Remise globale (%)"><input type="number" className="sv-field w-32" value={doc.global_discount} onChange={(e) => up({ global_discount: Number(e.target.value) })} /></Field>
          </div>
          <div className="sv-bento grid gap-3 p-5">
            <Field label="Introduction"><textarea rows={3} className="sv-field" value={doc.intro ?? ""} onChange={(e) => up({ intro: e.target.value })} /></Field>
            <Field label="Notes"><textarea rows={3} className="sv-field" value={doc.notes ?? ""} onChange={(e) => up({ notes: e.target.value })} /></Field>
            <Field label="Conditions"><textarea rows={3} className="sv-field" value={doc.terms ?? ""} onChange={(e) => up({ terms: e.target.value })} /></Field>
          </div>
        </fieldset>
        <div className="2xl:sticky 2xl:top-6 2xl:self-start">
          <ScaledPreview scale={0.7} doc={doc} settings={settings} payments={payments} />
          <div className="mt-4"><DocHistory id={doc.id} refreshKey={hv} createdAt={(doc as { created_at?: string }).created_at} /></div>
        </div>
      </div>
    </div>
  );
}
