import { fo } from "@/facturodoo/lib/db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, CheckCircle2, FileUp, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { connectionQuery, invoicesQuery, statusLabel, fmtMoney } from "@/facturodoo/lib/queries";
import { analyzeInvoice } from "@/facturodoo/lib/invoices.functions";
import type { ExtractedInvoice } from "@/facturodoo/lib/invoice-types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/facturodoo/")({
  head: () => ({
    meta: [
      { title: "Scanner une facture — FacturOdoo" },
      { name: "description", content: "Déposez une facture fournisseur PDF pour l'analyser et la créer dans Odoo." },
      { property: "og:title", content: "Scanner une facture — FacturOdoo" },
      { property: "og:description", content: "Analyse IA et création dans Odoo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Scanner,
});

function Scanner() {
  const { data: conn, isLoading: connLoading } = useQuery(connectionQuery);
  const { data: invoices } = useQuery(invoicesQuery);
  const analyze = useServerFn(analyzeInvoice);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<null | "upload" | "analyze">(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { toast.error("Seuls les fichiers PDF sont acceptés."); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Fichier trop volumineux (20 Mo max)."); return; }
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) return;

    setStep("upload");
    const { data: row, error } = await fo(supabase).from("fo_invoices").insert({ user_id: uid, file_name: file.name, status: "analyzing" }).select("id").single();
    if (error || !row) { setStep(null); { toast.error("Impossible d'enregistrer la facture."); return; } }
    const path = `${uid}/${row.id}.pdf`;
    const { error: upErr } = await supabase.storage.from("facturodoo-invoices").upload(path, file, { contentType: "application/pdf" });
    if (upErr) {
      await fo(supabase).from("fo_invoices").update({ status: "error", error_message: "Échec du dépôt du PDF." }).eq("id", row.id);
      setStep(null);
      { toast.error("Échec du dépôt du PDF."); return; }
    }
    await fo(supabase).from("fo_invoices").update({ storage_path: path }).eq("id", row.id);

    setStep("analyze");
    try {
      await analyze({ data: { invoiceId: row.id } });
      toast.success("Facture analysée. Vérifiez les données avant l'envoi.");
      navigate({ to: "/facturodoo/factures/$id", params: { id: row.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStep(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const recent = (invoices ?? []).slice(0, 5);
  const created = (invoices ?? []).filter((i) => i.status === "created").length;
  const pending = (invoices ?? []).filter((i) => i.status === "review").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fo-fade-up">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Scanner une facture</h1>
        <p className="mt-1 text-muted-foreground">Déposez un PDF : extraction IA, rapprochement fournisseur, création dans Odoo.</p>
      </div>

      {!connLoading && !conn && (
        <div className="flex flex-col gap-3 rounded-xl border border-fo-warning/50 bg-fo-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-fo-warning-foreground" />
            <div className="text-sm">
              <p className="font-semibold">Odoo n'est pas encore connecté</p>
              <p className="text-muted-foreground">Vous pouvez analyser des factures, mais l'envoi vers Odoo nécessite une connexion.</p>
            </div>
          </div>
          <Link to="/facturodoo/connexion"><Button variant="outline" size="sm">Connecter Odoo <ArrowRight className="size-4" /></Button></Link>
        </div>
      )}

      <div
        className="fo-dropzone relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center overflow-hidden p-8 text-center"
        data-active={dragging}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !step && inputRef.current?.click()}
        role="button"
        aria-label="Déposer une facture PDF"
      >
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        {step ? (
          <>
            <div className="pointer-events-none absolute inset-x-8 top-8 h-20 rounded-lg bg-gradient-to-b from-fo-copper/30 to-transparent animate-fo-scan" />
            <Loader2 className="size-10 animate-spin text-fo-copper" />
            <p className="mt-4 font-semibold">{step === "upload" ? "Dépôt du PDF…" : "Analyse intelligente en cours…"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{step === "analyze" ? "Lecture du fournisseur, des lignes, des taxes et des totaux." : "Quelques secondes."}</p>
          </>
        ) : (
          <>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <FileUp className="size-6" />
            </div>
            <p className="mt-5 text-lg font-semibold">Glissez votre facture d'achat ici</p>
            <p className="mt-1 text-sm text-muted-foreground">ou cliquez pour choisir un PDF (20 Mo max)</p>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="size-3.5" /> Analyse par Lovable AI
            </span>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Factures créées dans Odoo" value={created} />
        <Stat label="En attente de vérification" value={pending} />
        <Stat label="Total scanné" value={invoices?.length ?? 0} />
      </div>

      {recent.length > 0 && (
        <section className="fo-surface overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="font-semibold">Dernières factures</h2>
            <Link to="/facturodoo/factures" className="text-sm font-medium text-fo-copper">Tout voir</Link>
          </div>
          <ul className="divide-y">
            {recent.map((inv) => {
              const ex = inv.extracted as unknown as ExtractedInvoice | null;
              const st = statusLabel[inv.status] ?? statusLabel["review"]!;
              return (
                <li key={inv.id}>
                  <Link to="/facturodoo/factures/$id" params={{ id: inv.id }} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50">
                    {inv.status === "created" ? <CheckCircle2 className="size-5 shrink-0 text-fo-success" /> : <span className="size-5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{ex?.supplier?.name || inv.file_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{ex?.invoice_number ?? inv.file_name}{inv.odoo_move_name ? ` · ${inv.odoo_move_name}` : ""}</p>
                    </div>
                    <span className="hidden font-semibold fo-tabular sm:block">{fmtMoney(ex?.total, ex?.currency)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.tone}`}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="fo-surface p-5">
      <p className="text-3xl font-bold fo-tabular">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
