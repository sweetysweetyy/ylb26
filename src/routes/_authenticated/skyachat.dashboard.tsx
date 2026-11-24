import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileCheck2, FileText, Plus, Receipt, ReceiptText, ShoppingCart } from "lucide-react";
import { Button } from "@/skyachat/components/ui/button";
import { Card } from "@/skyachat/components/ui/card";
import { Badge } from "@/skyachat/components/ui/badge";
import { motion } from "motion/react";
import { documentsQuery } from "@/skyachat/lib/queries";
import { DOC_PLURAL, DOC_SHORT, STATUS_LABEL, formatDate, formatMoney, parseSnapshot, type DocType } from "@/skyachat/lib/doc";

export const Route = createFileRoute("/_authenticated/skyachat/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — SkyAchat" },
      { name: "description", content: "Vue d'ensemble de vos devis, commandes, factures et réceptions." },
      { property: "og:title", content: "Tableau de bord — SkyAchat" },
      { property: "og:description", content: "Vue d'ensemble de vos achats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const icons: Record<DocType, typeof FileText> = { quote: FileText, order: ShoppingCart, delivery: FileCheck2, invoice: Receipt, credit_note: ReceiptText };

const PLURAL = DOC_PLURAL;

function Dashboard() {
  const { data = [], isLoading } = useQuery(documentsQuery());
  const count = (t: DocType) => data.filter((d) => d.type === t).length;
  const ordersTotal = data.filter((d) => d.type === "order").reduce((s, d) => s + Number(d.total_ttc), 0);
  const invoicesTotal = data.filter((d) => d.type === "invoice").reduce((s, d) => s + Number(d.total_ttc), 0);
  const credits = data.filter((d) => d.type === "credit_note" && d.status !== "cancelled" && d.status !== "draft").reduce((s, d) => s + Number(d.total_ttc), 0);
  const unpaid = Math.max(0, data.filter((d) => d.type === "invoice" && d.status !== "paid" && d.status !== "cancelled").reduce((s, d) => s + Number(d.total_ttc), 0) - credits);
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const dueSoon = data
    .filter((d) => d.type === "invoice" && d.due_date && d.status !== "paid" && d.status !== "cancelled" && d.due_date <= in7)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));

  const kpis = [
    { label: "Engagé (commandes TTC)", value: formatMoney(ordersTotal), tone: "" },
    { label: "Facturé TTC", value: formatMoney(invoicesTotal), tone: "" },
    { label: "Reste à payer", value: formatMoney(unpaid), tone: "text-destructive" },
  ];
  const fade = (i: number) => ({ initial: { opacity: 0, y: 16, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <motion.div {...fade(0)} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="live">Cockpit achats en direct</Badge>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Tableau de <span className="sa-text-holo">bord</span></h1>
        </div>
        <Button asChild variant="holo" size="lg">
          <Link to="/skyachat/documents/new" search={{ type: "quote" }}>
            <Plus className="h-4 w-4" /> Nouvelle demande de devis
          </Link>
        </Button>
      </motion.div>

      <div className="grid auto-rows-[minmax(8.5rem,auto)] gap-4 md:grid-cols-4">
        <motion.div {...fade(1)} className="md:col-span-2 md:row-span-2">
          <Card variant="bento" className="flex h-full flex-col justify-between p-6">
            <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full sa-bg-holo opacity-30 blur-3xl" />
            <p className="text-sm text-muted-foreground">Reste à payer</p>
            <div>
              <p className="font-display text-5xl font-bold tracking-tight md:text-6xl">{formatMoney(unpaid)}</p>
              <p className="mt-2 text-sm text-muted-foreground">sur {formatMoney(invoicesTotal)} facturés</p>
            </div>
          </Card>
        </motion.div>
        {(["quote", "order", "delivery", "invoice"] as DocType[]).map((t, i) => {
          const I = icons[t];
          return (
            <motion.div key={t} {...fade(i + 2)}>
              <Link to="/skyachat/documents" search={{ type: t }} className="block h-full">
                <Card variant="bento" className="flex h-full flex-col justify-between p-5">
                  <span className="grid size-9 place-items-center rounded-xl sa-bg-holo text-primary-foreground"><I className="h-4 w-4" /></span>
                  <div>
                    <p className="font-display text-3xl font-bold">{isLoading ? "…" : count(t)}</p>
                    <p className="text-sm text-muted-foreground">{PLURAL[t]}</p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
        {kpis.slice(0, 2).map((k, i) => (
          <motion.div key={k.label} {...fade(i + 6)} className="md:col-span-2">
            <Card variant="bento" className="flex h-full flex-col justify-between p-5">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className={`font-display text-3xl font-bold ${k.tone}`}>{k.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {dueSoon.length > 0 && (
        <Card variant="bento" className="hover:translate-y-0">
          <div className="flex items-center gap-2 border-b px-6 py-4 font-display text-lg font-semibold"><AlertTriangle className="h-4 w-4 text-destructive" />Échéances à surveiller (retard ou sous 7 jours)</div>
          <ul className="divide-y">
            {dueSoon.map((d) => (
              <li key={d.id}>
                <Link to="/skyachat/documents/$id" params={{ id: d.id }} className="flex items-center justify-between gap-4 px-6 py-3 text-sm hover:bg-accent/40">
                  <span><b>{d.number}</b> <span className="text-muted-foreground">{parseSnapshot(d.contact).company}</span></span>
                  <span className="flex items-center gap-4">
                    <span className={d.due_date! < today ? "font-medium text-destructive" : "text-muted-foreground"}>{d.due_date! < today ? "En retard — " : ""}{formatDate(d.due_date)}</span>
                    <span className="text-xs text-muted-foreground">{STATUS_LABEL[d.status ?? "draft"]}</span>
                    <span className="w-24 text-right font-medium">{formatMoney(Number(d.total_ttc), d.currency)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <motion.div {...fade(8)}>
      <Card variant="bento" className="hover:translate-y-0">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <span className="font-display text-lg font-semibold">Activité récente</span>
          <Badge variant="live">Temps réel</Badge>
        </div>
        {data.length === 0 && !isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Aucun document pour l'instant. Commencez par ajouter un contact, puis créez votre première demande de devis.
          </div>
        ) : (
          <ul className="divide-y">
            {data.slice(0, 10).map((d) => (
              <li key={d.id}>
                <Link to="/skyachat/documents/$id" params={{ id: d.id }} className="flex items-center justify-between gap-4 px-6 py-3 text-sm transition hover:bg-accent/40">
                  <span className="flex min-w-0 items-center gap-3">
                    <Badge variant="secondary">{DOC_SHORT[d.type]}</Badge>
                    <span className="font-medium">{d.number}</span>
                    <span className="truncate text-muted-foreground">{parseSnapshot(d.contact).company || d.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-4">
                    <span className="hidden text-muted-foreground sm:inline">{formatDate(d.issue_date)}</span>
                    <span className="text-xs text-muted-foreground">{STATUS_LABEL[d.status ?? "draft"]}</span>
                    <span className="w-24 text-right font-medium">{formatMoney(Number(d.total_ttc), d.currency)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </motion.div>
    </div>
  );
}
