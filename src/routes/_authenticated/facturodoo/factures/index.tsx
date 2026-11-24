import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileStack } from "lucide-react";
import { invoicesQuery, statusLabel, fmtMoney, fmtDate } from "@/facturodoo/lib/queries";
import type { ExtractedInvoice } from "@/facturodoo/lib/invoice-types";

export const Route = createFileRoute("/_authenticated/facturodoo/factures/")({
  head: () => ({
    meta: [
      { title: "Historique des factures — FacturOdoo" },
      { name: "description", content: "Toutes vos factures scannées et leur statut dans Odoo." },
      { property: "og:title", content: "Historique des factures — FacturOdoo" },
      { property: "og:description", content: "Suivi des factures envoyées vers Odoo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: History,
});

const filters = ["all", "review", "created", "error"] as const;
const filterLabel: Record<(typeof filters)[number], string> = { all: "Toutes", review: "À vérifier", created: "Créées", error: "Erreurs" };

function History() {
  const { data: invoices, isLoading } = useQuery(invoicesQuery);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const list = (invoices ?? []).filter((i) => filter === "all" || i.status === filter);

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fo-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Historique</h1>
          <p className="mt-1 text-muted-foreground">Mise à jour en temps réel.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm font-medium">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 transition-colors ${filter === f ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {filterLabel[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="fo-surface overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center text-muted-foreground">
            <FileStack className="size-8" />
            <p className="mt-3 text-sm">Aucune facture pour ce filtre.</p>
            <Link to="/facturodoo" className="mt-2 text-sm font-medium text-fo-copper">Scanner une facture</Link>
          </div>
        ) : (
          <ul className="divide-y">
            {list.map((inv) => {
              const ex = inv.extracted as unknown as ExtractedInvoice | null;
              const st = statusLabel[inv.status] ?? statusLabel["review"]!;
              return (
                <li key={inv.id}>
                  <Link to="/facturodoo/factures/$id" params={{ id: inv.id }} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-muted/50 sm:grid-cols-[1.4fr_1fr_auto_auto]">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{ex?.supplier?.name || inv.file_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{ex?.invoice_number ?? "—"} · {fmtDate(ex?.invoice_date ?? inv.created_at)}</p>
                    </div>
                    <p className="hidden truncate text-xs text-muted-foreground sm:block">
                      {inv.odoo_move_name ? `Facture ${inv.odoo_move_name}` : ""}{inv.odoo_purchase_name ? ` · BC ${inv.odoo_purchase_name}` : ""}
                      {inv.odoo_partner_created ? " · nouveau fournisseur" : ""}
                      {inv.status === "error" && inv.error_message ? inv.error_message : ""}
                    </p>
                    <span className="hidden font-semibold fo-tabular sm:block">{fmtMoney(ex?.total, ex?.currency)}</span>
                    <span className={`justify-self-end rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.tone}`}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
