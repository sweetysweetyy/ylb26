import { postPaymentToAccounting } from "@/skycomptable/lib/bridge";
import { AccountingBadge, autoPost } from "@/skycomptable/components/AccountingBadge";
import { productToItem, type DocStatus } from "@/skyachat/lib/doc";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Check, Download, FileUp, Lock, Paperclip, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { extractInvoice } from "@/skyachat/lib/invoice.functions";
import { sfPrepare } from "@/skyfacturation/lib/gateway.functions";
import { DocHistory, logHistory } from "@/skyachat/lib/history";
import { SaPayments } from "@/skyachat/components/SaPayments";
import { chainQuery, contactsQuery, documentQuery, existingNumbers, productsQuery, settingsQuery } from "@/skyachat/lib/queries";
import {
  DOC_LABEL, DOC_SHORT, DOC_STEPS, STATUS_LABEL, blankItem, computeTotals, contactToSnapshot, formatDate, formatMoney,
  lineTotal, newId, nextNumber, parseItems, parseSnapshot, prefixFor, shouldLock, remainingItems, threeWayMatch, exceedsLme, LME_MAX_DAYS, type ContactSnapshot, type DocType, type DocumentRow, type LineItem,
} from "@/skyachat/lib/doc";
import { downloadPdf, pdfFile, type PdfDoc } from "@/skyachat/lib/pdf";
import { Mail } from "lucide-react";
import { DocumentEmailDialog } from "@/sendy/components/DocumentEmailDialog";
import { Button } from "@/skyachat/components/ui/button";
import { Card } from "@/skyachat/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/skyachat/documents/$id")({
  head: () => ({
    meta: [
      { title: "Document — SkyAchat" },
      { name: "description", content: "Édition du document avec aperçu en direct et export PDF." },
      { property: "og:title", content: "Document — SkyAchat" },
      { property: "og:description", content: "Édition et export PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocPage,
});

type Draft = Required<Omit<PdfDoc, "source_number">> & { status: DocStatus; contact_id: string | null };

function toDraft(d: DocumentRow): Draft {
  return {
    type: d.type, number: d.number, title: d.title ?? "", issue_date: d.issue_date ?? "", due_date: d.due_date ?? "", delivery_date: d.delivery_date ?? "",
    delivery_address: d.delivery_address ?? "", supplier_reference: d.supplier_reference ?? "", contact: parseSnapshot(d.contact),
    items: parseItems(d.items), discount_percent: Number(d.discount_percent), shipping: Number(d.shipping), currency: d.currency ?? "EUR",
    notes: d.notes ?? "", payment_terms: d.payment_terms ?? "", signer_name: d.signer_name ?? "", signature_data_url: d.signature_data_url ?? "",
    signed_at: d.signed_at ?? "", reception_ok: !!d.reception_ok, reception_remarks: d.reception_remarks ?? "", status: d.status ?? "draft", contact_id: d.contact_id,
  };
}

function DocPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: doc } = useQuery(documentQuery(id));
  const { data: contacts = [] } = useQuery(contactsQuery);
  const { data: products = [] } = useQuery(productsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const rootId = doc ? doc.root_id ?? doc.id : "";
  const { data: chain = [] } = useQuery({ ...chainQuery(rootId), enabled: !!rootId });
  const [d, setD] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [hv, setHv] = useState(0);
  const [hasPayments, setHasPayments] = useState(false);
  const log = (label: string) => logHistory(id, label).then(() => setHv((v) => v + 1));
  const extract = useServerFn(extractInvoice);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (doc) setD(toDraft(doc)); }, [doc]);
  if (!doc || !d) return <p className="text-muted-foreground">Chargement…</p>;
  const totals = computeTotals(d.items, d.discount_percent, d.shipping);
  const source = chain.find((c) => c.id === doc.source_id);
  const up = (p: Partial<Draft>) => setD({ ...d, ...p });
  const upItem = (i: number, p: Partial<LineItem>) => up({ items: d.items.map((it, j) => (j === i ? { ...it, ...p } : it)) });
  const upContact = (p: Partial<ContactSnapshot>) => up({ contact: { ...d.contact, ...p } });
  const locked = !!doc.is_locked;
  const orderDoc = chain.find((c) => c.type === "order");
  const deliveries = chain.filter((c) => c.type === "delivery" && (!orderDoc || c.source_id === orderDoc.id)).map((c) => parseItems(c.items));
  const remaining = d.type === "order" ? remainingItems(d.items, chain.filter((c) => c.type === "delivery" && c.source_id === id).map((c) => parseItems(c.items))) : [];
  const match = d.type === "invoice" ? threeWayMatch(orderDoc ? parseItems(orderDoc.items) : null, deliveries, d.items) : null;
  const lmeAlert = (d.type === "invoice" || d.type === "order") && exceedsLme(d.issue_date, d.due_date);

  async function save(silent = false) {
    const t = computeTotals(d!.items, d!.discount_percent, d!.shipping);
    const { type: _t, ...rest } = d!;
    const is_locked = doc!.is_locked || shouldLock(d!.type, d!.status);
    const { error } = doc!.is_locked
      ? await supabase.from("sa_documents").update({ status: d!.status, notes: d!.notes }).eq("id", id)
      : await supabase.from("sa_documents").update({
          ...rest, items: rest.items as never, contact: rest.contact as never, total_ht: t.ht, total_vat: t.vat, total_ttc: t.ttc, is_locked,
        }).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    if (!hasPayments && d!.status === "paid" && doc!.status !== "paid" && (d!.type === "invoice" || d!.type === "credit_note")) {
      const r = await postPaymentToAccounting("skyachat", { id: id, amount: Number(doc!.total_ttc), date: new Date().toISOString().slice(0, 10), invoiceNumber: doc!.number ?? null, partner: (doc!.contact as { company?: string } | null)?.company ?? "", credit: d!.type === "credit_note" });
      if (r.ok) toast.success(`Écriture ${r.number} créée en banque`); else toast.warning(`À comptabiliser : ${r.reason}`);
    }
    await log(d!.status !== doc!.status ? `Modifié — statut : ${STATUS_LABEL[d!.status]}` : silent ? "Enregistré automatiquement" : "Modification enregistrée");
    if (!silent) toast.success("Enregistré");
    qc.invalidateQueries({ queryKey: ["sa-documents"] });
    qc.invalidateQueries({ queryKey: ["sa-document", id] });
    return true;
  }

  async function convert(type: DocType, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      if (!(await save(true))) return;
      const number = nextNumber(prefixFor(type, settings), new Date().getFullYear(), await existingNumbers(type));
      const { data, error } = await supabase.from("sa_documents").insert({
        type, number, root_id: rootId, source_id: id, contact_id: d!.contact_id, contact: d!.contact as never, title: d!.title,
        items: d!.items as never, discount_percent: d!.discount_percent, shipping: d!.shipping, currency: d!.currency,
        payment_terms: d!.payment_terms, delivery_address: d!.delivery_address, total_ht: totals.ht, total_vat: totals.vat, total_ttc: totals.ttc,
        ...extra,
      }).select("id").single();
      if (error) throw error;
      await log(`Converti en ${DOC_LABEL[type]} ${number}`);
      await logHistory(data.id, `${DOC_LABEL[type]} ${number} créé depuis ${DOC_LABEL[d!.type]} ${d!.number}`);
      if (type === "order") await supabase.from("sa_documents").update({ status: "accepted" }).eq("id", id);
      qc.invalidateQueries();
      toast.success(`${DOC_LABEL[type]} créé`);
      navigate({ to: "/skyachat/documents/$id", params: { id: data.id } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  async function importInvoice(file: File) {
    if (file.size > 15_000_000) { toast.error("Fichier trop lourd (15 Mo max)."); return; }
    setBusy(true);
    const t = toast.loading("Lecture de la facture…");
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = `${u.user!.id}/${id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("skyachat-attachments").upload(path, file);
      if (upErr) throw upErr;
      const b64 = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.readAsDataURL(file); });
      const { invoice, error } = await extract({ data: { fileBase64: b64, mimeType: file.type || "application/pdf", filename: file.name } });
      const base = { attachment_path: path, attachment_name: file.name };
      if (!invoice) { toast.error(error ?? "Échec"); await convert("invoice", base); return; }
      const items: LineItem[] = (invoice.items ?? []).map((i) => ({ ...blankItem(), id: newId(), ...i, quantity: Number(i.quantity) || 1, unit_price: Number(i.unit_price) || 0, vat_rate: Number(i.vat_rate) || 0 }));
      const tt = computeTotals(items, 0, Number(invoice.shipping) || 0);
      await convert("invoice", {
        ...base, supplier_reference: invoice.invoice_number ?? "", issue_date: invoice.issue_date || new Date().toISOString().slice(0, 10),
        due_date: invoice.due_date || null, items, discount_percent: 0, shipping: Number(invoice.shipping) || 0,
        contact: { ...d!.contact, ...Object.fromEntries(Object.entries(invoice.supplier ?? {}).filter(([, v]) => v)) },
        payment_terms: invoice.payment_terms || d!.payment_terms, notes: invoice.notes ?? "", currency: invoice.currency || "EUR",
        total_ht: tt.ht, total_vat: tt.vat, total_ttc: tt.ttc,
      });
      toast.success("Facture recréée à partir du document importé");
    } catch (e) { toast.error((e as Error).message); } finally { toast.dismiss(t); setBusy(false); }
  }

  async function openAttachment() {
    if (!doc!.attachment_path) return;
    const w = window.open("", "_blank");
    const { data } = await supabase.storage.from("skyachat-attachments").createSignedUrl(doc!.attachment_path, 120);
    if (w && data) w.location.href = data.signedUrl;
  }

  async function approveBap() {
    if (!match) return;
    if (!match.ok && !confirm("Des écarts ont été détectés entre la commande, la réception et la facture. Valider quand même le Bon à payer ?")) return;
    const name = prompt("Nom du valideur (visa Bon à payer) :")?.trim();
    if (!name) return;
    if (!(await save(true))) return;
    const { error } = await supabase.from("sa_documents").update({
      status: "approved", is_locked: true, bap_approved_at: new Date().toISOString(), bap_approved_by: name,
      matching_status: match.ok ? "matched" : "overridden",
      matching_notes: match.lines.flatMap((l) => l.issues.map((x) => `${l.name} : ${x}`)).join("\n"),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    void log(`Bon à payer validé par ${name}`);
    await autoPost("skyachat", { id: doc!.id, type: d!.type, number: doc!.number, issue_date: doc!.issue_date ?? new Date().toISOString().slice(0, 10), total_ht: Number(doc!.total_ht), total_vat: Number(doc!.total_vat), total_ttc: Number(doc!.total_ttc), partner: (doc!.contact as { company?: string } | null)?.company ?? "" });
    toast.success("Bon à payer validé — facture verrouillée");
    qc.invalidateQueries();
  }

  async function markDisputed() {
    if (!match) return;
    const notes = match.lines.flatMap((l) => l.issues.map((x) => `${l.name} : ${x}`)).join("\n");
    const { error } = await supabase.from("sa_documents").update({ status: "disputed", matching_status: "mismatch", matching_notes: notes }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    void log("Facture mise en litige");
    toast.success("Facture mise en litige");
    qc.invalidateQueries();
  }

  async function remove() {
    if (locked) { toast.error("Document verrouillé : suppression interdite. Créez un avoir."); return; }
    if (!confirm("Supprimer ce document ?")) return;
    const { error } = await supabase.from("sa_documents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
    navigate({ to: "/skyachat/documents", search: { type: d!.type } });
  }

  const pdfDoc: PdfDoc = { ...d, source_number: source?.number ?? "" };
  const company = settings?.company_name ?? "";
  const mailVars = {
    numero: d.number, type: DOC_LABEL[d.type], contact: d.contact.contact_name || d.contact.company, fournisseur: d.contact.company,
    societe: company, montant: formatMoney(totals.ttc, d.currency), echeance: formatDate(d.due_date), livraison: formatDate(d.delivery_date), objet: d.title,
  };
  const defaultSubject = `[${DOC_LABEL[d.type]} ${d.number}] ${
    d.type === "quote" ? "Demande de prix" : d.type === "order" ? (d.delivery_date ? `Commande - livraison souhaitée le ${formatDate(d.delivery_date)}` : "Confirmation de commande")
    : d.type === "delivery" ? "Réception de marchandises" : d.type === "invoice" ? `Votre facture ${d.supplier_reference || ""}`.trim() : "Avoir"
  } - ${company}`;
  const mailFacts = [
    `Document : ${DOC_LABEL[d.type]} ${d.number}`, d.title && `Objet : ${d.title}`,
    `Fournisseur : ${d.contact.company}${d.contact.contact_name ? ` (contact : ${d.contact.contact_name})` : ""}`,
    `Acheteur : ${company}`, `Montant TTC : ${formatMoney(totals.ttc, d.currency)}`, `Date : ${formatDate(d.issue_date)}`,
    d.delivery_date && `Date de livraison : ${formatDate(d.delivery_date)}`, d.delivery_address && `Adresse de livraison : ${d.delivery_address}`,
    d.due_date && `Échéance : ${formatDate(d.due_date)}`, d.payment_terms && `Conditions de paiement : ${d.payment_terms}`,
    d.supplier_reference && `Référence fournisseur : ${d.supplier_reference}`,
    d.type === "delivery" && (d.reception_ok ? "Réception conforme" : `Réserves à la réception : ${d.reception_remarks || "non précisées"}`),
  ].filter(Boolean).join("\n");
  async function onMailSent() {
    void log("Envoyé par e-mail");
    if (d!.status !== "draft") return;
    const { error } = await supabase.from("sa_documents").update({ status: "sent" }).eq("id", id);
    if (!error) { setD({ ...d!, status: "sent" }); qc.invalidateQueries({ queryKey: ["sa-document", id] }); qc.invalidateQueries({ queryKey: ["sa-documents"] }); }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      {/* Breadcrumb / stepper */}
      <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Étapes">
        {DOC_STEPS.map((step, i) => {
          const found = chain.find((c) => c.type === step);
          const active = step === d.type;
          return (
            <div key={step} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
              {found ? (
                <Link to="/skyachat/documents/$id" params={{ id: found.id }} className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${active ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  <Check className="h-3.5 w-3.5" />{DOC_SHORT[step]} <span className="opacity-70">{found.number}</span>
                </Link>
              ) : (
                <span className="rounded-full border border-dashed px-3 py-1 text-muted-foreground">{DOC_SHORT[step]}</span>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{DOC_LABEL[d.type]}</p>
          <h1 className="flex items-center gap-2 font-display text-3xl">{d.number}{locked && <Lock className="h-5 w-5 text-muted-foreground" aria-label="Verrouillé" />}</h1>
          {locked && <p className="text-xs text-muted-foreground">Document verrouillé (inaltérable) — seul le statut peut évoluer.</p>}
          {doc.bap_approved_at && <p className="text-xs text-muted-foreground">Bon à payer visé par {doc.bap_approved_by} le {formatDate(doc.bap_approved_at)}</p>}
          {(d.type === "invoice" || d.type === "credit_note") && (doc.status === "approved" || doc.status === "paid" || doc.is_locked) && <div className="mt-1"><AccountingBadge source="skyachat" refreshKey={doc.updated_at} doc={{ id: doc.id, type: d.type, number: doc.number, issue_date: doc!.issue_date ?? new Date().toISOString().slice(0, 10), total_ht: Number(doc.total_ht), total_vat: Number(doc.total_vat), total_ttc: Number(doc.total_ttc), partner: (doc.contact as { company?: string } | null)?.company ?? "" }} /></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={d.status} onValueChange={(v) => up({ status: v as Draft["status"] })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(STATUS_LABEL).filter(([k]) => !(d.type === "invoice" && k === "paid" && d.status !== "approved" && d.status !== "paid")).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => save()}><Save className="mr-1 h-4 w-4" />Enregistrer</Button>
          <Button variant="outline" onClick={() => { void downloadPdf(pdfDoc, settings ?? {}).then(() => log("PDF téléchargé")); }}><Download className="mr-1 h-4 w-4" />PDF</Button>
          <Button variant="outline" onClick={async () => { if (await save(true)) setMailOpen(true); }}><Mail className="mr-1 h-4 w-4" />Envoyer par e-mail</Button>
          <DocumentEmailDialog
            open={mailOpen} onOpenChange={setMailOpen} app="skyachat" docId={id} docType={d.type} docLabel={DOC_LABEL[d.type]}
            docNumber={d.number} recipient={d.contact.email} defaultSubject={defaultSubject} vars={mailVars} facts={mailFacts}
            getPdf={() => pdfFile(pdfDoc, settings ?? {})} onSent={onMailSent}
          />
          {d.type === "quote" && <Button disabled={busy} onClick={() => convert("order")}>Passer en commande</Button>}
          {d.type === "order" && (
            <>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importInvoice(f); e.target.value = ""; }} />
              <Button disabled={busy || remaining.length === 0} onClick={() => convert("delivery", { items: remaining, delivery_date: new Date().toISOString().slice(0, 10), status: "draft" })}>
                {remaining.length === 0 ? "Entièrement réceptionnée" : "Réceptionner"}
              </Button>
              <Button disabled={busy} onClick={() => fileRef.current?.click()}><FileUp className="mr-1 h-4 w-4" />Importer la facture</Button>
              <Button variant="secondary" disabled={busy} onClick={() => convert("invoice")}>Facture manuelle</Button>
            </>
          )}
          {d.type === "invoice" && d.status !== "approved" && d.status !== "paid" && (
            <>
              <Button disabled={busy} onClick={approveBap}><ShieldCheck className="mr-1 h-4 w-4" />Bon à payer</Button>
              <Button variant="secondary" disabled={busy} onClick={markDisputed}>Mettre en litige</Button>
            </>
          )}
          {d.type === "invoice" && <Button variant="outline" disabled={busy} onClick={() => convert("credit_note", { status: "draft" })}>Créer un avoir</Button>}
          {locked && (d.type === "invoice" || d.type === "credit_note") && <Button variant="outline" disabled={busy} onClick={async () => { try { const r = await sfPrepare({ data: { source_app: "skyachat", doc_id: id } }); await log("Transmis à Sky Facturation"); navigate({ to: "/skyfacturation/$id", params: { id: r.id } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Transmission impossible"); } }}><ArrowRight className="mr-1 h-4 w-4" />Transmettre à Sky Facturation</Button>}
          {doc.attachment_path && <Button variant="ghost" onClick={openAttachment}><Paperclip className="mr-1 h-4 w-4" />{doc.attachment_name}</Button>}
          {!locked && <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={remove}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </div>
      </div>

      {lmeAlert && (
        <Card className="flex items-center gap-2 border-destructive/50 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />Échéance au-delà de {LME_MAX_DAYS} jours après la date du document : plafond légal (loi LME) dépassé.
        </Card>
      )}

      {d.type === "order" && remaining.length > 0 && remaining.length !== d.items.length && (
        <Card className="p-3 text-sm">Réception partielle — reste à recevoir : {remaining.map((r) => `${r.name} × ${r.quantity}`).join(", ")}</Card>
      )}

      {match && (
        <Card className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Rapprochement Commande / Réception / Facture</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${match.ok ? "bg-secondary" : "bg-destructive text-destructive-foreground"}`}>{match.ok ? "Conforme" : "Écarts détectés"}</span>
          </div>
          {!orderDoc && <p className="text-sm text-muted-foreground">Aucune commande liée : rapprochement impossible.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-1.5">Article</th><th className="p-1.5 text-right">Commandé</th><th className="p-1.5 text-right">Reçu</th><th className="p-1.5 text-right">Facturé</th><th className="p-1.5 text-right">P.U. cmd</th><th className="p-1.5 text-right">P.U. fact.</th><th className="p-1.5">Contrôle</th></tr></thead>
              <tbody className="divide-y">
                {match.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="p-1.5">{l.name}</td><td className="p-1.5 text-right">{l.ordered}</td><td className="p-1.5 text-right">{l.received}</td><td className="p-1.5 text-right">{l.invoiced}</td>
                    <td className="p-1.5 text-right">{l.orderPrice === null ? "—" : formatMoney(l.orderPrice, d.currency)}</td><td className="p-1.5 text-right">{formatMoney(l.invoicePrice, d.currency)}</td>
                    <td className={`p-1.5 text-xs ${l.issues.length ? "text-destructive" : "text-muted-foreground"}`}>{l.issues.length ? l.issues.join(" · ") : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Editor */}
        <fieldset disabled={locked} className="min-w-0 space-y-5">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Client / fournisseur</Label>
              <Select value={d.contact_id ?? ""} onValueChange={(v) => { const c = contacts.find((x) => x.id === v); if (c) up({ contact_id: v, contact: contactToSnapshot(c), payment_terms: c.payment_terms || d.payment_terms }); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un contact…" /></SelectTrigger>
                <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.company || c.contact_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(["company", "contact_name", "email", "phone", "address", "zip", "city", "siret", "vat_number"] as (keyof ContactSnapshot)[]).map((k) => (
              <div key={k} className="space-y-1"><Label className="text-xs text-muted-foreground">{k}</Label><Input value={d.contact[k]} onChange={(e) => upContact({ [k]: e.target.value })} /></div>
            ))}
          </Card>
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label>Objet</Label><Input value={d.title} onChange={(e) => up({ title: e.target.value })} /></div>
            <div className="space-y-1"><Label>N°</Label><Input value={d.number} onChange={(e) => up({ number: e.target.value })} /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={d.issue_date} onChange={(e) => up({ issue_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>{d.type === "invoice" ? "Échéance" : "Date souhaitée"}</Label><Input type="date" value={d.due_date ?? ""} onChange={(e) => up({ due_date: e.target.value || null })} /></div>
            <div className="space-y-1"><Label>Réf. fournisseur</Label><Input value={d.supplier_reference} onChange={(e) => up({ supplier_reference: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Adresse de livraison</Label><Input value={d.delivery_address} onChange={(e) => up({ delivery_address: e.target.value })} /></div>
          </Card>
          <Card className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg">Lignes</h2>
              <div className="flex gap-2">
                <Select value="" onValueChange={(v) => { const p = products.find((x) => x.id === v); if (p) up({ items: [...d.items, productToItem(p)] }); }}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="+ Depuis le catalogue" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => up({ items: [...d.items, blankItem()] })}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            {d.items.map((it, i) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 rounded border p-2">
                <Input className="col-span-12 sm:col-span-6" placeholder="Désignation" value={it.name} onChange={(e) => upItem(i, { name: e.target.value })} />
                <Input className="col-span-12 sm:col-span-6" placeholder="Description" value={it.description} onChange={(e) => upItem(i, { description: e.target.value })} />
                <Input className="col-span-3" type="number" title="Qté" value={it.quantity} onChange={(e) => upItem(i, { quantity: Number(e.target.value) })} />
                <Input className="col-span-3" type="number" step="0.01" title="P.U. HT" value={it.unit_price} onChange={(e) => upItem(i, { unit_price: Number(e.target.value) })} />
                <Input className="col-span-2" type="number" title="TVA %" value={it.vat_rate} onChange={(e) => upItem(i, { vat_rate: Number(e.target.value) })} />
                <Input className="col-span-2" type="number" title="Remise %" value={it.discount} onChange={(e) => upItem(i, { discount: Number(e.target.value) })} />
                <Button className="col-span-2" variant="ghost" size="icon" aria-label="Retirer" onClick={() => up({ items: d.items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Remise globale %</Label><Input type="number" value={d.discount_percent} onChange={(e) => up({ discount_percent: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Frais de port HT</Label><Input type="number" value={d.shipping} onChange={(e) => up({ shipping: Number(e.target.value) })} /></div>
            </div>
          </Card>
          <Card className="space-y-3 p-5">
            <div className="space-y-1"><Label>Conditions de paiement</Label><Textarea value={d.payment_terms} onChange={(e) => up({ payment_terms: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={d.notes} onChange={(e) => up({ notes: e.target.value })} /></div>
          </Card>
          {d.type === "delivery" && (
            <Card className="space-y-3 p-5">
              <h2 className="text-lg">Réception & signature</h2>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.reception_ok} onChange={(e) => up({ reception_ok: e.target.checked })} />Réception conforme, sans réserve</label>
              <Textarea placeholder="Réserves / remarques" value={d.reception_remarks} onChange={(e) => up({ reception_remarks: e.target.value })} />
              <Input placeholder="Nom du signataire" value={d.signer_name} onChange={(e) => up({ signer_name: e.target.value })} />
              <SignaturePad value={d.signature_data_url ?? ""} onChange={(v) => up({ signature_data_url: v, signed_at: v ? new Date().toISOString() : null, status: v ? "signed" : d.status })} />
            </Card>
          )}
        </fieldset>

        {/* Live preview */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <Preview d={d} totals={totals} settings={settings} sourceNumber={source?.number} />
          {d.type === "invoice" && (
            <SaPayments doc={doc} onCount={(n) => setHasPayments(n > 0)} onChange={(paid, fully) => {
              setHasPayments(paid > 0);
              void log(fully ? "Règlement enregistré — facture payée" : "Règlement partiel enregistré");
              qc.invalidateQueries({ queryKey: ["sa-document", id] });
              qc.invalidateQueries({ queryKey: ["sa-documents"] });
            }} />
          )}
          <div className="mt-4"><DocHistory id={id} refreshKey={hv} createdAt={doc.created_at ?? undefined} /></div>
        </div>
      </div>
    </div>
  );
}

function Preview({ d, totals, settings, sourceNumber }: { d: Draft; totals: ReturnType<typeof computeTotals>; settings?: Partial<import("@/skyachat/lib/doc").Settings> | undefined; sourceNumber?: string | undefined }) {
  const primary = settings?.primary_color || "#1f4d3a";
  const accent = settings?.accent_color || "#c8873a";
  return (
    <div className="aspect-[210/297] overflow-auto rounded-xl bg-paper p-8 text-[11px] text-paper-foreground shadow-paper sa-halo" style={{ borderTop: `6px solid ${primary}` }}>
      <div className="flex justify-between">
        {settings?.logo_data_url ? <img src={settings.logo_data_url} alt="" className="max-h-14 max-w-40" /> : <b style={{ color: primary }} className="text-base">{settings?.company_name}</b>}
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: primary }}>{DOC_LABEL[d.type].toUpperCase()}</p>
          <p>N° {d.number}</p><p>Date : {formatDate(d.issue_date)}</p>
          {d.due_date && <p>Échéance : {formatDate(d.due_date)}</p>}
          {sourceNumber && <p>Réf. : {sourceNumber}</p>}
          {d.supplier_reference && <p>Réf. fournisseur : {d.supplier_reference}</p>}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="rounded bg-muted p-3"><p className="text-[9px] font-bold" style={{ color: accent }}>ÉMETTEUR</p><b>{settings?.company_name}</b><p>{settings?.address}</p><p>{settings?.zip} {settings?.city}</p><p>{settings?.email}</p></div>
        <div className="p-3" style={{ borderLeft: `3px solid ${accent}` }}><p className="text-[9px] font-bold" style={{ color: accent }}>{d.type === "invoice" ? "FOURNISSEUR" : "DESTINATAIRE"}</p><b>{d.contact.company}</b><p>{d.contact.contact_name}</p><p>{d.contact.address}</p><p>{d.contact.zip} {d.contact.city}</p><p>{d.contact.email}</p></div>
      </div>
      {d.title && <p className="mt-4 font-bold">Objet : {d.title}</p>}
      <table className="mt-3 w-full">
        <thead><tr style={{ background: primary, color: "#fff" }}><th className="p-1.5 text-left">Désignation</th><th className="p-1.5 text-right">Qté</th><th className="p-1.5 text-right">P.U. HT</th><th className="p-1.5 text-right">TVA</th><th className="p-1.5 text-right">Total HT</th></tr></thead>
        <tbody>{d.items.map((i) => <tr key={i.id} className="border-b"><td className="p-1.5"><b>{i.name}</b><br /><span className="text-muted-foreground">{i.description}</span></td><td className="p-1.5 text-right">{i.quantity}</td><td className="p-1.5 text-right">{formatMoney(i.unit_price, d.currency)}</td><td className="p-1.5 text-right">{i.vat_rate}%</td><td className="p-1.5 text-right font-semibold">{formatMoney(lineTotal(i), d.currency)}</td></tr>)}</tbody>
      </table>
      <div className="ml-auto mt-3 w-60 space-y-0.5">
        <div className="flex justify-between"><span>Total HT</span><span>{formatMoney(totals.ht, d.currency)}</span></div>
        {totals.vatByRate.map((v) => <div key={v.rate} className="flex justify-between"><span>TVA {v.rate}%</span><span>{formatMoney(v.vat, d.currency)}</span></div>)}
        <div className="mt-1 flex justify-between rounded p-1.5 font-bold" style={{ background: primary, color: "#fff" }}><span>TOTAL TTC</span><span>{formatMoney(totals.ttc, d.currency)}</span></div>
      </div>
      {d.payment_terms && <p className="mt-4"><b style={{ color: accent }}>Conditions : </b>{d.payment_terms}</p>}
      {d.notes && <p className="mt-2 whitespace-pre-wrap">{d.notes}</p>}
      {d.type === "delivery" && d.signature_data_url && <div className="mt-4"><p className="font-bold">Signature — {d.signer_name}</p><img src={d.signature_data_url} alt="Signature" className="h-16" /></div>}
      <p className="mt-6 border-t pt-2 text-[9px] text-muted-foreground" style={{ borderColor: accent }}>{settings?.legal_mentions}</p>
    </div>
  );
}

function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  return (
    <div className="space-y-2">
      {value ? <img src={value} alt="Signature" className="h-28 rounded border bg-card" /> : (
        <canvas ref={ref} width={460} height={140} className="w-full touch-none rounded border bg-card"
          onPointerDown={(e) => { drawing.current = true; const c = ref.current!.getContext("2d")!; const [x, y] = pos(e); c.lineWidth = 2; c.lineCap = "round"; c.beginPath(); c.moveTo(x, y); }}
          onPointerMove={(e) => { if (!drawing.current) return; const c = ref.current!.getContext("2d")!; const [x, y] = pos(e); c.lineTo(x, y); c.stroke(); }}
          onPointerUp={() => { drawing.current = false; }} />
      )}
      <div className="flex gap-2">
        {!value && <Button size="sm" onClick={() => ref.current && onChange(ref.current.toDataURL("image/png"))}>Valider la signature</Button>}
        <Button size="sm" variant="outline" onClick={() => { onChange(""); ref.current?.getContext("2d")?.clearRect(0, 0, 460, 140); }}>Effacer</Button>
      </div>
    </div>
  );
}
