import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, useTable } from "@/skycomptable/components/CrudTable";
import { usePostedLines } from "@/skycomptable/lib/ledger";
import { useCompany } from "@/skycomptable/lib/session";
import { accountNature, formatEUR, round2 } from "@/skycomptable/lib/accounting";
import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/skycomptable/components/ui/badge";

export const Route = createFileRoute("/_authenticated/skycomptable/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Registre" },
      { name: "description", content: "Vue d'ensemble de votre comptabilité." },
      { property: "og:title", content: "Tableau de bord — Registre" },
      { property: "og:description", content: "Vue d'ensemble de votre comptabilité." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { data: ctx } = useCompany();
  const accounts = useTable<{ id: string; code: string; account_type: string }>("skc_chart_accounts");
  const skc_journals = useTable("skc_journals");
  const periods = useTable("skc_fiscal_periods");
  const drafts = useTable<{ status: string }>("skc_accounting_entries");
  const lines = usePostedLines();
  const type = new Map((accounts.data ?? []).map((a) => [a.id, accountNature(a.code, a.account_type)]));
  let income = 0, expense = 0;
  for (const l of lines.data ?? []) {
    const t = type.get(l.account_id);
    if (t === "income") income += +l.credit - +l.debit;
    if (t === "expense") expense += +l.debit - +l.credit;
  }
  const draftCount = (drafts.data ?? []).filter((d) => d.status === "draft").length;
  const steps = [
    { done: (accounts.data?.length ?? 0) > 0, label: "Créer le plan comptable", to: "/skycomptable/comptes" as const },
    { done: (skc_journals.data?.length ?? 0) > 0, label: "Créer les journaux", to: "/skycomptable/journaux" as const },
    { done: (periods.data?.length ?? 0) > 0, label: "Ouvrir une période comptable", to: "/skycomptable/periodes" as const },
  ];

  return (
    <div>
      <PageHeader title={ctx?.company.name ?? "Tableau de bord"} subtitle="Vue d'ensemble — écritures validées." />
      <div className="grid gap-4 md:grid-cols-4">
        <Stat i={0} big label="Résultat" value={formatEUR(round2(income - expense))} />
        <Stat i={1} label="Produits" value={formatEUR(round2(income))} />
        <Stat i={2} label="Charges" value={formatEUR(round2(expense))} />
        <Stat i={3} label="Brouillons à valider" value={String(draftCount)} />
      </div>
      {steps.some((s) => !s.done) && (
        <div className="skc-glass skc-glow mt-4 rounded-3xl p-6">
          <h2 className="text-xl">Mise en route</h2>
          <ul className="mt-3 space-y-2">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                {s.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                <Link to={s.to} className="underline-offset-2 hover:underline">{s.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, big, i }: { label: string; value: string; big?: boolean; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 22 }}
      whileHover={{ y: -3 }}
      className={`skc-glass skc-glow relative overflow-hidden rounded-3xl p-5 ${big ? "md:col-span-2 md:row-span-2" : i === 3 ? "md:col-span-2" : ""}`}
    >
      {big && <div className="skc-holo-bg pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-30 blur-3xl" />}
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {big && <Badge variant="live">En direct</Badge>}
      </div>
      <div className={`num mt-3 ${big ? "skc-holo-text text-5xl font-semibold" : "text-2xl"}`}>{value}</div>
    </motion.div>
  );
}
