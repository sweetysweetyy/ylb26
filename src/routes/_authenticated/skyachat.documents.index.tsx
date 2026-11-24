import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";
import { documentsQuery } from "@/skyachat/lib/queries";
import { DOC_PLURAL, STATUS_LABEL, formatDate, formatMoney, parseSnapshot } from "@/skyachat/lib/doc";
import { Button } from "@/skyachat/components/ui/button";
import { Card } from "@/skyachat/components/ui/card";

export const Route = createFileRoute("/_authenticated/skyachat/documents/")({
  validateSearch: z.object({ type: z.enum(["quote", "order", "delivery", "invoice", "credit_note"]).catch("quote") }),
  head: () => ({
    meta: [
      { title: "Documents — SkyAchat" },
      { name: "description", content: "Vos demandes de devis, bons de commande, factures et livrables." },
      { property: "og:title", content: "Documents — SkyAchat" },
      { property: "og:description", content: "Vos documents d'achat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocList,
});

function DocList() {
  const { type } = Route.useSearch();
  const { data = [], isLoading } = useQuery(documentsQuery(type));
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl">{DOC_PLURAL[type]}</h1>
        {type === "quote" && (
          <Button asChild><Link to="/skyachat/documents/new" search={{ type: "quote" }}><Plus className="mr-1 h-4 w-4" />Nouvelle demande</Link></Button>
        )}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">N°</th><th className="p-3">Tiers</th><th className="p-3">Objet</th><th className="p-3">Date</th><th className="p-3">Statut</th><th className="p-3 text-right">TTC</th></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Aucun document.</td></tr>}
            {data.map((d) => (
              <tr key={d.id} className="hover:bg-muted/30">
                <td className="p-3 font-medium"><Link to="/skyachat/documents/$id" params={{ id: d.id }} className="hover:underline">{d.number}</Link></td>
                <td className="p-3">{parseSnapshot(d.contact).company}</td>
                <td className="p-3 text-muted-foreground">{d.title}</td>
                <td className="p-3">{formatDate(d.issue_date)}</td>
                <td className="p-3 text-xs">{STATUS_LABEL[d.status ?? "draft"]}{d.is_locked ? " 🔒" : ""}</td>
                <td className="p-3 text-right">{formatMoney(Number(d.total_ttc), d.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
