import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/skyvente/components/ui/button";
import { Badge } from "@/skyvente/components/ui/badge";
import { PageHeader } from "@/skyvente/components/AppShell";
import { sb } from "@/skyvente/lib/supabase";
import { eur, fdate } from "@/skyvente/lib/calc";
import type { Doc, DocType } from "@/skyvente/lib/types";
import { DOC_LABEL, STATUS_LABEL } from "@/skyvente/lib/types";

export const Route = createFileRoute("/_authenticated/skyvente/documents/")({ component: Documents });

const TABS: ("all" | DocType)[] = ["all", "quote", "order", "invoice", "credit_note", "delivery"];

function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [tab, setTab] = useState<"all" | DocType>("all");
  const [q, setQ] = useState("");
  useEffect(() => {
    sb().from("sv_documents").select("*").order("created_at", { ascending: false }).then(({ data }) => setDocs((data as Doc[]) || []));
  }, []);
  const list = docs.filter((d) => (tab === "all" || d.type === tab) && `${d.number} ${d.client?.name} ${d.title}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Documents" subtitle="Devis, bons de commande, factures et livrables"
        actions={<Button asChild variant="holo"><Link to="/skyvente/documents/new" search={{ contact: undefined }}><Plus /> Nouveau devis</Link></Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "secondary" : "ghost"} onClick={() => setTab(t)}>
            {t === "all" ? "Tous" : DOC_LABEL[t]} <span className="text-xs opacity-60">{t === "all" ? docs.length : docs.filter((d) => d.type === t).length}</span>
          </Button>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input className="sv-field pl-9" placeholder="Numéro, client…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="sv-bento overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-4">Document</th><th className="p-4">Client</th><th className="p-4">Date</th><th className="p-4">Statut</th><th className="p-4 text-right">Total TTC</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((d) => (
              <tr key={d.id} className="hover:bg-accent/30">
                <td className="p-4"><Link to="/skyvente/documents/$id" params={{ id: d.id }} className="font-medium hover:text-primary">{DOC_LABEL[d.type]} {d.number ?? "(brouillon)"}</Link>{d.title && <div className="text-xs text-muted-foreground">{d.title}</div>}</td>
                <td className="p-4">{d.client?.name}</td>
                <td className="p-4">{fdate(d.issue_date)}</td>
                <td className="p-4"><Badge variant="outline">{STATUS_LABEL[d.status] ?? d.status}</Badge></td>
                <td className="p-4 text-right font-semibold">{eur(d.total_ttc)}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucun document</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
