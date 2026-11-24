import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { FileText, Package, Plus, Receipt, Users } from "lucide-react";
import { Button } from "@/skyvente/components/ui/button";
import { Badge } from "@/skyvente/components/ui/badge";
import { PageHeader } from "@/skyvente/components/AppShell";
import { sb } from "@/skyvente/lib/supabase";
import { eur, fdate } from "@/skyvente/lib/calc";
import type { Doc } from "@/skyvente/lib/types";
import { DOC_LABEL, STATUS_LABEL } from "@/skyvente/lib/types";

export const Route = createFileRoute("/_authenticated/skyvente/")({ component: Dashboard });

function Dashboard() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [counts, setCounts] = useState({ contacts: 0, services: 0 });
  useEffect(() => {
    sb().from("sv_documents").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setDocs((data as Doc[]) || []));
    Promise.all([
      sb().from("sv_contacts").select("id", { count: "exact", head: true }),
      sb().from("sv_services").select("id", { count: "exact", head: true }),
    ]).then(([c, s]) => setCounts({ contacts: c.count || 0, services: s.count || 0 }));
  }, []);

  const quotes = docs.filter((d) => d.type === "quote");
  const pending = quotes.filter((d) => ["draft", "sent"].includes(d.status));
  const invoices = docs.filter((d) => d.type === "invoice" && d.status !== "draft");
  const revenue = invoices.reduce((s, d) => s + Number(d.total_ttc), 0);
  const paid = invoices.filter((d) => d.status === "paid").reduce((s, d) => s + Number(d.total_ttc), 0);
  const accepted = quotes.filter((d) => d.status === "accepted").length;
  const rate = quotes.length ? Math.round((accepted / quotes.length) * 100) : 0;

  const card = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06 } });

  return (
    <div>
      <PageHeader
        title="Cockpit"
        subtitle="Vue d'ensemble de votre activité"
        actions={<Button asChild variant="holo"><Link to="/skyvente/documents/new" search={{ contact: undefined }}><Plus /> Nouveau devis</Link></Button>}
      />
      <div className="grid auto-rows-[minmax(130px,auto)] gap-4 md:grid-cols-4">
        <motion.div {...card(0)} className="sv-bento relative overflow-hidden p-6 md:col-span-2 md:row-span-2">
          <div className="sv-bg-holo absolute -right-20 -top-20 size-64 rounded-full opacity-25 blur-3xl" />
          <Badge variant="live">En direct</Badge>
          <div className="mt-6 text-sm text-muted-foreground">Chiffre d'affaires facturé</div>
          <div className="font-display text-5xl font-bold">{eur(revenue)}</div>
          <div className="mt-2 text-sm text-muted-foreground">dont encaissé : <span className="text-foreground">{eur(paid)}</span></div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
            <div className="sv-bg-holo h-full" style={{ width: `${revenue ? (paid / revenue) * 100 : 0}%` }} />
          </div>
        </motion.div>
        <motion.div {...card(1)} className="sv-bento p-6">
          <FileText className="size-5 text-primary" />
          <div className="mt-3 font-display text-3xl font-bold">{pending.length}</div>
          <div className="text-sm text-muted-foreground">Devis en attente</div>
        </motion.div>
        <motion.div {...card(2)} className="sv-bento p-6">
          <Receipt className="size-5 text-primary" />
          <div className="mt-3 font-display text-3xl font-bold">{rate}%</div>
          <div className="text-sm text-muted-foreground">Taux d'acceptation</div>
        </motion.div>
        <motion.div {...card(3)} className="sv-bento p-6">
          <Users className="size-5 text-primary" />
          <div className="mt-3 font-display text-3xl font-bold">{counts.contacts}</div>
          <Link to="/skyvente/contacts" className="text-sm text-muted-foreground hover:text-foreground">Contacts →</Link>
        </motion.div>
        <motion.div {...card(4)} className="sv-bento p-6">
          <Package className="size-5 text-primary" />
          <div className="mt-3 font-display text-3xl font-bold">{counts.services}</div>
          <Link to="/skyvente/prestations" className="text-sm text-muted-foreground hover:text-foreground">Prestations →</Link>
        </motion.div>
        <motion.div {...card(5)} className="sv-bento flex flex-wrap items-center justify-between gap-3 p-6 md:col-span-4">
          <div>
            <h3 className="text-lg font-bold">Conformité</h3>
            <p className="text-sm text-muted-foreground">Vérifiez vos mentions obligatoires et exportez le journal des ventes pour votre expert-comptable.</p>
          </div>
          <Button asChild variant="glass"><Link to="/skyvente/conformite">Ouvrir →</Link></Button>
        </motion.div>
        <motion.div {...card(6)} className="sv-bento p-6 md:col-span-4">
          <h3 className="mb-4 text-lg font-bold">Documents récents</h3>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document. Commencez par ajouter vos prestations et contacts, puis créez un devis.</p>
          ) : (
            <div className="divide-y divide-border">
              {docs.slice(0, 8).map((d) => (
                <Link key={d.id} to="/skyvente/documents/$id" params={{ id: d.id }} className="flex items-center justify-between gap-4 py-3 hover:opacity-80">
                  <div>
                    <div className="font-medium">{DOC_LABEL[d.type]} {d.number ?? "(brouillon)"}</div>
                    <div className="text-xs text-muted-foreground">{d.client?.name} · {fdate(d.issue_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{STATUS_LABEL[d.status] ?? d.status}</Badge>
                    <span className="font-semibold">{eur(d.total_ttc)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
