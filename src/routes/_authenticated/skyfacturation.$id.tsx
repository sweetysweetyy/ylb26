import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { sf } from "@/skyfacturation/lib/db";
import { complianceIssues } from "@/skyfacturation/lib/checks";
import { sfConfirm, sfRefresh } from "@/skyfacturation/lib/gateway.functions";
import { SF_STATUS_LABEL } from "@/skyfacturation/types";

export const Route = createFileRoute("/_authenticated/skyfacturation/$id")({ component: Review });

const eur = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const KIND: Record<string, string> = { out_invoice: "Facture client", out_refund: "Avoir client", in_invoice: "Facture fournisseur", in_refund: "Avoir fournisseur" };

function Review() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const confirm = useServerFn(sfConfirm);
  const refresh = useServerFn(sfRefresh);
  const [busy, setBusy] = useState(false);
  const { data: t, isLoading } = useQuery({
    queryKey: ["sf", "transmission", id],
    queryFn: async () => (await sf(supabase).from("sf_transmissions").select("*").eq("id", id).single()).data,
  });
  if (isLoading) return <p>Chargement…</p>;
  if (!t) return <p>Transmission introuvable. <Link to="/skyfacturation" className="text-primary">Retour</Link></p>;
  const p = t.payload_preview;
  const issues = complianceIssues(p);
  const reload = () => { void qc.invalidateQueries({ queryKey: ["sf"] }); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); reload(); } };
  const sale = p.move_type.startsWith("out");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/skyfacturation" className="text-sm text-muted-foreground hover:text-foreground">← Transmissions</Link>
          <h1 className="text-2xl font-semibold">{KIND[p.move_type]} {p.reference}</h1>
          <div className="mt-1 flex gap-2">
            <span className={`sf-badge ${t.status === "error" ? "sf-err" : t.status === "pending_review" ? "" : "sf-ok"}`}>{SF_STATUS_LABEL[t.status]}</span>
            {t.odoo_name && <span className="sf-badge">Odoo : {t.odoo_name}</span>}
            {t.peppol_status && <span className="sf-badge">Peppol : {t.peppol_status}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {t.odoo_move_id ? (
            <Button variant="outline" disabled={busy} onClick={() => run(async () => { const r = await refresh({ data: { id } }); toast.success(`Statut Peppol : ${r.peppol ?? "non disponible"}`); })}><RefreshCw className="mr-1 h-4 w-4" />Actualiser le statut</Button>
          ) : (
            <Button disabled={busy || issues.length > 0} onClick={() => run(async () => { const r = await confirm({ data: { id } }); if (r.ok) toast.success(r.message); else toast.error(r.message); })}>
              <Send className="mr-1 h-4 w-4" />{busy ? "Transmission…" : sale ? "Confirmer : créer dans Odoo et envoyer (Peppol)" : "Confirmer : créer dans Odoo"}
            </Button>
          )}
        </div>
      </div>

      {t.error_log && <div className="sf-card sf-err p-4 text-sm"><AlertTriangle className="mr-2 inline h-4 w-4" />{t.error_log}</div>}
      {!t.odoo_move_id && (
        <div className={`sf-card p-4 text-sm ${issues.length ? "sf-err" : "sf-ok"}`}>
          {issues.length ? (<><b className="mb-1 block"><AlertTriangle className="mr-2 inline h-4 w-4" />À corriger dans {t.source_app === "skyvente" ? "Sky Vente" : "Sky Achat"} avant l'envoi :</b><ul className="list-disc pl-6">{issues.map((i) => <li key={i}>{i}</li>)}</ul></>)
            : (<><CheckCircle2 className="mr-2 inline h-4 w-4" />Contrôles de conformité réussis. Vérifiez les informations puis confirmez.</>)}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="sf-card p-4 text-sm">
          <h2 className="mb-2 font-medium">{sale ? "Client" : "Fournisseur"}</h2>
          <p className="font-semibold">{p.partner.name || "—"}</p>
          <p>{p.partner.address}</p><p>{p.partner.zip} {p.partner.city} {p.partner.country}</p>
          <p className="mt-2 text-muted-foreground">SIRET : {p.partner.siret || "—"} · TVA : {p.partner.vat_number || "—"}</p>
          <p className="text-muted-foreground">{p.partner.email}</p>
        </div>
        <div className="sf-card p-4 text-sm">
          <h2 className="mb-2 font-medium">Facture</h2>
          <p>Date : {p.invoice_date}</p><p>Échéance : {p.due_date ?? "—"}</p>
          <p className="mt-2">Total HT : {eur(p.total_ht)}</p><p>TVA : {eur(p.total_vat)}</p><p className="font-semibold">Total TTC : {eur(p.total_ttc)}</p>
        </div>
      </div>

      <div className="sf-card overflow-x-auto">
        <table className="sf-table w-full">
          <thead><tr><th>Libellé</th><th>Qté</th><th>Prix unitaire HT</th><th>Remise</th><th>TVA</th></tr></thead>
          <tbody>{p.lines.map((l, i) => (<tr key={i}><td>{l.name}</td><td>{l.quantity}</td><td>{eur(l.unit_price)}</td><td>{l.discount ? `${l.discount} %` : "—"}</td><td>{l.vat_rate} %</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
