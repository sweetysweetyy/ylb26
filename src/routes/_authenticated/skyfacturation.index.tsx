import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sf } from "@/skyfacturation/lib/db";
import { SF_STATUS_LABEL } from "@/skyfacturation/types";

export const Route = createFileRoute("/_authenticated/skyfacturation/")({ component: List });

const eur = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function List() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["sf", "transmissions"],
    queryFn: async () => (await sf(supabase).from("sf_transmissions").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Transmissions électroniques</h1>
      <p className="mb-6 text-sm text-muted-foreground">Factures envoyées depuis Sky Vente et Sky Achat vers Odoo Facturation, et factures reçues.</p>
      <div className="sf-card overflow-x-auto">
        <table className="sf-table w-full">
          <thead><tr><th>Date</th><th>Origine</th><th>Facture</th><th>Tiers</th><th>Total TTC</th><th>Odoo</th><th>Statut</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7}>Chargement…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={7} className="text-muted-foreground">Aucune transmission. Utilisez le bouton « Sky Facturation » sur une facture Sky Vente ou Sky Achat.</td></tr>}
            {data.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.created_at).toLocaleDateString("fr-FR")}</td>
                <td>{t.source_app === "skyvente" ? "Sky Vente" : t.source_app === "skyachat" ? "Sky Achat" : "Odoo (reçue)"}</td>
                <td><Link to="/skyfacturation/$id" params={{ id: t.id }} className="text-primary hover:underline">{t.source_doc_ref || "—"}</Link></td>
                <td>{t.payload_preview?.partner?.name}</td>
                <td>{eur(Number(t.payload_preview?.total_ttc ?? 0))}</td>
                <td>{t.odoo_name ?? "—"}</td>
                <td><span className={`sf-badge ${t.status === "error" ? "sf-err" : t.status === "pending_review" ? "" : "sf-ok"}`}>{SF_STATUS_LABEL[t.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
