import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sfImportInbound, sfInbound, sfInboundPreview } from "@/skyfacturation/lib/gateway.functions";

export const Route = createFileRoute("/_authenticated/skyfacturation/reception")({ component: Reception });

const eur = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
type Preview = Awaited<ReturnType<typeof sfInboundPreview>>;

function Reception() {
  const list = useServerFn(sfInbound);
  const preview = useServerFn(sfInboundPreview);
  const importFn = useServerFn(sfImportInbound);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState<{ id: number; data: Preview } | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["sf", "inbound"], queryFn: () => list() });

  const show = async (id: number) => { setBusy(true); try { setOpen({ id, data: await preview({ data: { move_id: id } }) }); } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); } };
  const doImport = async () => {
    if (!open) return; setBusy(true);
    try { const r = await importFn({ data: { move_id: open.id } }); toast.success("Facture importée dans Sky Achat"); void qc.invalidateQueries({ queryKey: ["sf"] }); navigate({ to: "/skyachat/documents/$id", params: { id: r.doc_id } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold">Factures fournisseurs reçues</h1>
        <p className="text-sm text-muted-foreground">Factures arrivées dans Odoo Facturation (Peppol). Vérifiez-les puis importez-les dans Sky Achat sans ressaisie.</p>
      </div>
      {data?.error && <div className="sf-card sf-err p-4 text-sm">{data.error}</div>}
      <div className="sf-card overflow-x-auto">
        <table className="sf-table w-full">
          <thead><tr><th>Odoo</th><th>Réf. fournisseur</th><th>Fournisseur</th><th>Date</th><th>Total TTC</th><th>Peppol</th><th></th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7}>Interrogation d'Odoo…</td></tr>}
            {!isLoading && !data?.rows.length && <tr><td colSpan={7} className="text-muted-foreground">Aucune facture fournisseur trouvée dans Odoo.</td></tr>}
            {data?.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name || "Brouillon"}</td><td>{r.ref}</td><td>{r.partner}</td><td>{r.date}</td><td>{eur(r.total)}</td><td>{r.peppol ?? "—"}</td>
                <td>{r.imported ? <span className="sf-badge sf-ok">Importée</span> : <Button size="sm" variant="outline" disabled={busy} onClick={() => show(r.id)}>Vérifier</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="sf-card space-y-3 p-4 text-sm">
          <h2 className="text-lg font-medium">Aperçu avant import : {open.data.ref}</h2>
          <p><b>{open.data.partner.name}</b> — SIRET {open.data.partner.siret || "—"} · TVA {open.data.partner.vat_number || "—"}</p>
          <p className="text-muted-foreground">{open.data.partner.address} {open.data.partner.zip} {open.data.partner.city}</p>
          <table className="sf-table w-full">
            <thead><tr><th>Libellé</th><th>Qté</th><th>PU HT</th><th>TVA</th></tr></thead>
            <tbody>{open.data.lines.map((l, i) => <tr key={i}><td>{l.name}</td><td>{l.quantity}</td><td>{eur(l.unit_price)}</td><td>{l.vat_rate} %</td></tr>)}</tbody>
          </table>
          <p>HT {eur(open.data.total_ht)} · TVA {eur(open.data.total_vat)} · <b>TTC {eur(open.data.total_ttc)}</b></p>
          <div className="flex gap-2"><Button disabled={busy} onClick={doImport}>Confirmer l'import dans Sky Achat</Button><Button variant="outline" onClick={() => setOpen(null)}>Annuler</Button></div>
        </div>
      )}
    </div>
  );
}
