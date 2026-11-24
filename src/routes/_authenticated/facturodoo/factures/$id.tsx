import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { invoiceQuery, statusLabel, fmtMoney } from "@/facturodoo/lib/queries";
import { analyzeInvoice, pushInvoiceToOdoo, searchSuppliers } from "@/facturodoo/lib/invoices.functions";
import { emptyInvoice, type ExtractedInvoice, type ExtractedLine, type SupplierCandidate, type SupplierMatch } from "@/facturodoo/lib/invoice-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/facturodoo/factures/$id")({
  head: () => ({
    meta: [
      { title: "Vérifier la facture — FacturOdoo" },
      { name: "description", content: "Relisez les données extraites et créez la facture dans Odoo." },
      { property: "og:title", content: "Vérifier la facture — FacturOdoo" },
      { property: "og:description", content: "Relecture et envoi vers Odoo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Review,
});

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

function Review() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: inv, isLoading } = useQuery(invoiceQuery(id));
  const push = useServerFn(pushInvoiceToOdoo);
  const analyze = useServerFn(analyzeInvoice);
  const search = useServerFn(searchSuppliers);

  const [ex, setEx] = useState<ExtractedInvoice>(emptyInvoice);
  const [partner, setPartner] = useState<SupplierCandidate | null>(null);
  const [candidates, setCandidates] = useState<SupplierCandidate[]>([]);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [createPO, setCreatePO] = useState(true);
  const [attach, setAttach] = useState(true);
  const [busy, setBusy] = useState<null | "push" | "analyze">(null);

  useEffect(() => {
    if (!inv) return;
    if (inv.extracted) setEx({ ...emptyInvoice, ...(inv.extracted as unknown as ExtractedInvoice) });
    const m = inv.supplier_match as unknown as SupplierMatch | null;
    setCandidates(m?.candidates ?? []);
    setPartner(m?.best ?? null);
  }, [inv?.id, inv?.updated_at]);

  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Chargement…</p>;
  if (!inv) return <p className="p-8 text-center text-muted-foreground">Facture introuvable.</p>;

  const st = statusLabel[inv.status] ?? statusLabel["review"]!;
  const done = inv.status === "created";
  const setS = (k: keyof ExtractedInvoice["supplier"], v: string) => setEx((e) => ({ ...e, supplier: { ...e.supplier, [k]: k === "name" ? v : v || null } }));
  const setLine = (i: number, patch: Partial<ExtractedLine>) => setEx((e) => ({ ...e, lines: e.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); };

  async function doSearch() {
    if (!q.trim()) return;
    setSearching(true);
    try { setCandidates(await search({ data: { query: q.trim() } })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSearching(false); }
  }

  async function doAnalyze() {
    setBusy("analyze");
    try { await analyze({ data: { invoiceId: id } }); toast.success("Facture ré-analysée."); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); refresh(); }
  }

  async function doPush() {
    if (!ex.supplier.name.trim() && !partner) { toast.error("Indiquez un fournisseur."); return; }
    setBusy("push");
    try {
      const r = await push({ data: { invoiceId: id, extracted: ex, partnerId: partner?.id ?? null, createPurchaseOrder: createPO, attachPdf: attach } });
      toast.success(`Créée dans Odoo : ${r.moveName ?? "facture"}${r.purchaseName ? ` · ${r.purchaseName}` : ""}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); refresh(); }
  }

  const f = (label: string, value: string | null | undefined, on: (v: string) => void, type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value ?? ""} disabled={done} onChange={(e) => on(e.target.value)} />
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fo-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/facturodoo/factures" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Historique</Link>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{ex.supplier.name || inv.file_name}</h1>
          <p className="text-sm text-muted-foreground">{inv.file_name}{ex.confidence ? ` · confiance ${Math.round(ex.confidence * (ex.confidence <= 1 ? 100 : 1))} %` : ""}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.tone}`}>{st.label}</span>
      </div>

      {inv.error_message && <div className="fo-surface border-destructive/40 p-4 text-sm text-destructive">{inv.error_message}</div>}

      {done && (
        <div className="fo-surface flex items-start gap-3 p-5">
          <CheckCircle2 className="mt-0.5 size-5 text-fo-success" />
          <div className="text-sm">
            <p className="font-semibold">Facture créée dans Odoo</p>
            <p className="text-muted-foreground">
              Facture {inv.odoo_move_name ?? `#${inv.odoo_move_id}`}
              {inv.odoo_purchase_name ? ` · Bon de commande ${inv.odoo_purchase_name}` : ""}
              {inv.odoo_partner_created ? " · nouveau fournisseur créé" : " · fournisseur existant"}
            </p>
          </div>
        </div>
      )}

      {(inv.status === "analyzing" || inv.status === "error") && !inv.extracted && (
        <div className="fo-surface flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{inv.status === "analyzing" ? "Analyse en cours ou interrompue." : "L'analyse a échoué."}</p>
          <Button onClick={doAnalyze} disabled={busy !== null}>{busy === "analyze" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Relancer l'analyse</Button>
        </div>
      )}

      {inv.extracted && (
        <>
          <section className="fo-surface space-y-4 p-5">
            <h2 className="font-semibold">Fournisseur dans Odoo</h2>
            {!done && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {candidates.map((c) => (
                    <button key={c.id} onClick={() => setPartner(c)} className={`rounded-lg border p-3 text-left text-sm transition-colors ${partner?.id === c.id ? "border-fo-copper bg-accent" : "hover:bg-muted/50"}`}>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{[c.vat, c.city, c.email].filter(Boolean).join(" · ") || "—"}{c.match === "vat" ? " · même n° TVA" : ""}</p>
                    </button>
                  ))}
                  <button onClick={() => setPartner(null)} className={`flex items-center gap-2 rounded-lg border border-dashed p-3 text-left text-sm ${partner === null ? "border-fo-copper bg-accent" : "hover:bg-muted/50"}`}>
                    <Plus className="size-4" /> Créer un nouveau fournisseur « {ex.supplier.name || "—"} »
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Rechercher un fournisseur (nom ou TVA)…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
                  <Button variant="outline" onClick={doSearch} disabled={searching}>{searching ? <Loader2 className="animate-spin" /> : <Search />}</Button>
                </div>
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              {f("Nom", ex.supplier.name, (v) => setS("name", v))}
              {f("N° TVA", ex.supplier.vat, (v) => setS("vat", v))}
              {f("E-mail", ex.supplier.email, (v) => setS("email", v))}
              {f("Téléphone", ex.supplier.phone, (v) => setS("phone", v))}
              {f("Rue", ex.supplier.street, (v) => setS("street", v))}
              {f("Code postal", ex.supplier.zip, (v) => setS("zip", v))}
              {f("Ville", ex.supplier.city, (v) => setS("city", v))}
              {f("Pays", ex.supplier.country, (v) => setS("country", v))}
              {f("Site web", ex.supplier.website, (v) => setS("website", v))}
            </div>
          </section>

          <section className="fo-surface space-y-4 p-5">
            <h2 className="font-semibold">Facture</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {f("N° de facture", ex.invoice_number, (v) => setEx({ ...ex, invoice_number: v || null }))}
              {f("Date", ex.invoice_date, (v) => setEx({ ...ex, invoice_date: v || null }), "date")}
              {f("Échéance", ex.due_date, (v) => setEx({ ...ex, due_date: v || null }), "date")}
              {f("Devise", ex.currency, (v) => setEx({ ...ex, currency: v.toUpperCase() || null }))}
              {f("Référence de paiement", ex.payment_reference, (v) => setEx({ ...ex, payment_reference: v || null }))}
              {f("Notes", ex.notes, (v) => setEx({ ...ex, notes: v || null }))}
            </div>
          </section>

          <section className="fo-surface space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Lignes</h2>
              {!done && <Button size="sm" variant="outline" onClick={() => setEx({ ...ex, lines: [...ex.lines, { description: "", quantity: 1, unit_price: 0, tax_rate: null, total: null }] })}><Plus /> Ligne</Button>}
            </div>
            <div className="hidden grid-cols-[1fr_80px_110px_80px_36px] gap-2 text-xs text-muted-foreground sm:grid">
              <span>Description</span><span>Qté</span><span>Prix unit. HT</span><span>TVA %</span><span />
            </div>
            {ex.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_110px_80px_36px] gap-2">
                <Input value={l.description} disabled={done} onChange={(e) => setLine(i, { description: e.target.value })} />
                <Input inputMode="decimal" value={String(l.quantity)} disabled={done} onChange={(e) => setLine(i, { quantity: num(e.target.value) ?? 0 })} />
                <Input inputMode="decimal" value={String(l.unit_price)} disabled={done} onChange={(e) => setLine(i, { unit_price: num(e.target.value) ?? 0 })} />
                <Input inputMode="decimal" value={l.tax_rate ?? ""} disabled={done} onChange={(e) => setLine(i, { tax_rate: num(e.target.value) })} />
                {!done && <Button size="icon" variant="ghost" onClick={() => setEx({ ...ex, lines: ex.lines.filter((_, j) => j !== i) })}><Trash2 /></Button>}
              </div>
            ))}
            <div className="flex flex-wrap justify-end gap-6 border-t pt-3 text-sm fo-tabular">
              <span>HT <b>{fmtMoney(ex.subtotal, ex.currency)}</b></span>
              <span>TVA <b>{fmtMoney(ex.tax_amount, ex.currency)}</b></span>
              <span>TTC <b>{fmtMoney(ex.total, ex.currency)}</b></span>
            </div>
          </section>

          {!done && (
            <section className="fo-surface flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2"><Switch checked={createPO} onCheckedChange={setCreatePO} /> Créer le bon de commande (Achats)</label>
                <label className="flex items-center gap-2"><Switch checked={attach} onCheckedChange={setAttach} /> Joindre le PDF</label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={doAnalyze} disabled={busy !== null}>{busy === "analyze" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Ré-analyser</Button>
                <Button onClick={doPush} disabled={busy !== null || inv.status === "pushing"}>{busy === "push" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Créer dans Odoo</Button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
