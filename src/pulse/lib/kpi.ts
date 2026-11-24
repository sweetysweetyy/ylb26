// Pure KPI engine shared by Odoo sync and demo data.
export type RawData = {
  currency: string;
  company?: string;
  sales: { date: string; amount: number; confirmed: boolean; partner: string }[];
  purchases: { date: string; amount: number; confirmed: boolean; partner: string }[];
  invoices: { type: "out" | "in"; date: string; due: string | null; total: number; residual: number }[];
  lines: { product: string; amount: number }[];
  leads: { revenue: number; prob: number; active: boolean }[] | null;
  modules: string[];
};

export type Tone = "positive" | "warning" | "critical" | "info";
export type Kpi = {
  id: string;
  label: string;
  value: number;
  format: "money" | "pct" | "days" | "num";
  hint: string;
  tone: Tone;
  trend?: number[];
  delta?: number | null;
};
export type Insight = { id: string; tone: Tone; title: string; text: string; target: string };
export type Snapshot = {
  currency: string;
  company?: string | undefined;
  generatedAt: string;
  health: number;
  kpis: Kpi[];
  monthly: { m: string; sales: number; purchases: number }[];
  topCustomers: { name: string; value: number }[];
  topProducts: { name: string; value: number }[];
  topSuppliers: { name: string; value: number }[];
  receivables: { total: number; overdue: number };
  payables: { total: number; overdue: number };
  pipeline: { weighted: number; open: number; winRate: number | null } | null;
  insights: Insight[];
  modules: string[];
};

const monthKey = (d: string) => d.slice(0, 7);

function lastMonths(n: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function top(list: { k: string; v: number }[], n = 5) {
  const m = new Map<string, number>();
  for (const { k, v } of list) m.set(k, (m.get(k) ?? 0) + v);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));
}

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function computeSnapshot(raw: RawData): Snapshot {
  const months = lastMonths(12);
  const today = new Date().toISOString().slice(0, 10);
  const sales = raw.sales.filter((s) => s.confirmed);
  const purch = raw.purchases.filter((p) => p.confirmed);

  const monthly = months.map((m) => ({
    m,
    sales: sum(sales.filter((s) => monthKey(s.date) === m).map((s) => s.amount)),
    purchases: sum(purch.filter((p) => monthKey(p.date) === m).map((p) => p.amount)),
  }));
  const rev12 = sum(monthly.map((x) => x.sales));
  const pur12 = sum(monthly.map((x) => x.purchases));
  // Rolling 3 complete months vs previous 3
  const last3 = sum(monthly.slice(8, 11).map((x) => x.sales));
  const prev3 = sum(monthly.slice(5, 8).map((x) => x.sales));
  const growth = prev3 > 0 ? (last3 - prev3) / prev3 : 0;
  const margin = rev12 > 0 ? (rev12 - pur12) / rev12 : 0;
  const conv = raw.sales.length ? sales.length / raw.sales.length : 0;
  const avgOrder = sales.length ? rev12 / sales.length : 0;

  const out = raw.invoices.filter((i) => i.type === "out");
  const inn = raw.invoices.filter((i) => i.type === "in");
  const ar = sum(out.map((i) => i.residual));
  const arOver = sum(out.filter((i) => i.due && i.due < today).map((i) => i.residual));
  const ap = sum(inn.map((i) => i.residual));
  const apOver = sum(inn.filter((i) => i.due && i.due < today).map((i) => i.residual));
  const dso = rev12 > 0 ? ar / (rev12 / 365) : 0;
  const overdueRatio = ar > 0 ? arOver / ar : 0;

  const topCustomers = top(sales.map((s) => ({ k: s.partner, v: s.amount })));
  const topSuppliers = top(purch.map((p) => ({ k: p.partner, v: p.amount })));
  const topProducts = top(raw.lines.map((l) => ({ k: l.product, v: l.amount })));
  const concentration = rev12 > 0 && topCustomers[0] ? topCustomers[0].value / rev12 : 0;

  let pipeline: Snapshot["pipeline"] = null;
  if (raw.leads) {
    const open = raw.leads.filter((l) => l.active && l.prob < 100);
    const won = raw.leads.filter((l) => l.prob >= 100).length;
    const lost = raw.leads.filter((l) => !l.active && l.prob === 0).length;
    pipeline = {
      weighted: sum(open.map((l) => (l.revenue * l.prob) / 100)),
      open: open.length,
      winRate: won + lost > 0 ? won / (won + lost) : null,
    };
  }

  const health = Math.round(
    clamp(
      50 + clamp(growth * 100, -20, 20) + clamp((margin - 0.2) * 60, -15, 15) - clamp(overdueRatio * 30, 0, 15) -
        clamp((dso - 45) / 3, 0, 10) - (concentration > 0.3 ? 8 : 0) + (conv > 0.5 ? 5 : 0),
      0,
      100,
    ),
  );

  const salesTrend = monthly.map((x) => x.sales);
  const kpis: Kpi[] = [
    { id: "revenue", label: "Chiffre d'affaires 12 mois", value: rev12, format: "money", hint: "Commandes confirmées HT", tone: "info", trend: salesTrend, delta: growth },
    { id: "growth", label: "Croissance (3 mois)", value: growth, format: "pct", hint: "3 derniers mois vs 3 précédents", tone: growth >= 0.05 ? "positive" : growth >= 0 ? "warning" : "critical" },
    { id: "margin", label: "Marge brute estimée", value: margin, format: "pct", hint: "(Ventes − Achats) / Ventes", tone: margin >= 0.3 ? "positive" : margin >= 0.15 ? "warning" : "critical" },
    { id: "purchases", label: "Achats 12 mois", value: pur12, format: "money", hint: "Commandes fournisseurs confirmées", tone: "info", trend: monthly.map((x) => x.purchases) },
    { id: "dso", label: "Délai moyen d'encaissement", value: dso, format: "days", hint: "DSO = créances / CA journalier", tone: dso <= 45 ? "positive" : dso <= 70 ? "warning" : "critical" },
    { id: "overdue", label: "Créances en retard", value: arOver, format: "money", hint: `${Math.round(overdueRatio * 100)} % des créances`, tone: overdueRatio < 0.15 ? "positive" : overdueRatio < 0.35 ? "warning" : "critical" },
    { id: "cash", label: "Position nette tiers", value: ar - ap, format: "money", hint: "À encaisser − à payer", tone: ar - ap >= 0 ? "positive" : "warning" },
    { id: "conversion", label: "Taux de transformation", value: conv, format: "pct", hint: "Devis → commandes", tone: conv >= 0.5 ? "positive" : conv >= 0.3 ? "warning" : "critical" },
    { id: "basket", label: "Panier moyen", value: avgOrder, format: "money", hint: `${sales.length} commandes`, tone: "info" },
    { id: "concentration", label: "Dépendance client n°1", value: concentration, format: "pct", hint: topCustomers[0]?.name ?? "—", tone: concentration < 0.2 ? "positive" : concentration < 0.35 ? "warning" : "critical" },
  ];
  if (pipeline) {
    kpis.push({ id: "pipeline", label: "Pipeline pondéré", value: pipeline.weighted, format: "money", hint: `${pipeline.open} opportunités ouvertes`, tone: pipeline.weighted > last3 / 3 ? "positive" : "warning" });
  }

  const insights: Insight[] = [];
  if (growth < 0) insights.push({ id: "i-growth", tone: "critical", target: "chart-monthly", title: "Ventes en recul", text: `Le CA des 3 derniers mois baisse de ${Math.abs(Math.round(growth * 100))} %. Relancez vos meilleurs clients et le pipeline.` });
  else if (growth > 0.1) insights.push({ id: "i-growth", tone: "positive", target: "chart-monthly", title: "Dynamique forte", text: `+${Math.round(growth * 100)} % sur 3 mois. Sécurisez les achats et la capacité pour suivre.` });
  if (overdueRatio > 0.25) insights.push({ id: "i-ar", tone: "critical", target: "receivables", title: "Trésorerie sous tension", text: `${Math.round(overdueRatio * 100)} % des créances sont échues. Priorisez les relances.` });
  if (concentration > 0.3) insights.push({ id: "i-conc", tone: "warning", target: "top-customers", title: "Risque de dépendance", text: `${topCustomers[0]?.name} pèse ${Math.round(concentration * 100)} % du CA. Diversifiez le portefeuille.` });
  if (margin < 0.2) insights.push({ id: "i-margin", tone: "warning", target: "margin", title: "Marge faible", text: "Les achats absorbent une grande part des ventes. Renégociez fournisseurs ou prix." });
  if (conv < 0.35) insights.push({ id: "i-conv", tone: "warning", target: "conversion", title: "Devis peu transformés", text: "Moins d'un devis sur trois est signé. Travaillez le suivi commercial." });
  if (!insights.length) insights.push({ id: "i-ok", tone: "positive", target: "health", title: "Fondamentaux sains", text: "Aucun signal d'alerte majeur. Cherchez de nouveaux relais de croissance." });

  return {
    currency: raw.currency,
    company: raw.company ?? "Mon entreprise",
    generatedAt: new Date().toISOString(),
    health,
    kpis,
    monthly,
    topCustomers,
    topProducts,
    topSuppliers,
    receivables: { total: ar, overdue: arOver },
    payables: { total: ap, overdue: apOver },
    pipeline,
    insights,
    modules: raw.modules,
  };
}

export function demoRaw(): RawData {
  const months = lastMonths(12);
  const customers = ["Groupe Bourbon", "Océan Indien Distribution", "Hôtel Lagon Bleu", "Run Market", "Clinique du Port", "Cafés Le Volcan", "Ti Bazar"];
  const suppliers = ["Import Sud SA", "Logistique Mascareignes", "Agro Réunion", "TechPro"];
  const products = ["Pack Premium", "Abonnement Pro", "Installation", "Maintenance annuelle", "Formation", "Accessoires"];
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const sales: RawData["sales"] = [];
  const purchases: RawData["purchases"] = [];
  const lines: RawData["lines"] = [];
  const invoices: RawData["invoices"] = [];
  months.forEach((m, i) => {
    const n = 14 + Math.round(i * 0.8 + rnd() * 6);
    for (let k = 0; k < n; k++) {
      const amount = Math.round(1500 + rnd() * 6000 + i * 120);
      const confirmed = rnd() > 0.38;
      const partner = rnd() < 0.34 ? customers[0] : customers[Math.floor(rnd() * customers.length)];
      const date = `${m}-${String(1 + Math.floor(rnd() * 27)).padStart(2, "0")}`;
      sales.push({ date, amount, confirmed, partner });
      if (confirmed) {
        lines.push({ product: products[Math.floor(rnd() * products.length)], amount });
        const due = new Date(date);
        due.setDate(due.getDate() + 30);
        const paid = i < 9 ? rnd() > 0.08 : rnd() > 0.55;
        invoices.push({ type: "out", date, due: due.toISOString().slice(0, 10), total: amount * 1.085, residual: paid ? 0 : amount * 1.085 });
      }
    }
    const p = 6 + Math.floor(rnd() * 4);
    for (let k = 0; k < p; k++) {
      const amount = Math.round(1800 + rnd() * 4200);
      const date = `${m}-${String(1 + Math.floor(rnd() * 27)).padStart(2, "0")}`;
      purchases.push({ date, amount, confirmed: true, partner: suppliers[Math.floor(rnd() * suppliers.length)]! });
      const due = new Date(date);
      due.setDate(due.getDate() + 45);
      invoices.push({ type: "in", date, due: due.toISOString().slice(0, 10), total: amount, residual: i > 9 ? amount : 0 });
    }
  });
  const leads = Array.from({ length: 40 }, () => {
    const r = rnd();
    return { revenue: Math.round(3000 + rnd() * 20000), prob: r > 0.8 ? 100 : r > 0.65 ? 0 : Math.round(10 + rnd() * 70), active: r <= 0.65 || r > 0.8 };
  });
  return {
    currency: "EUR",
    company: "Démo — Société Austral",
    sales,
    purchases,
    lines,
    invoices,
    leads,
    modules: ["sale", "purchase", "account", "crm", "res.partner"],
  };
}

export function fmt(v: number, f: Kpi["format"], currency = "EUR") {
  if (f === "money")
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, notation: Math.abs(v) >= 100000 ? "compact" : "standard", maximumFractionDigits: Math.abs(v) >= 100000 ? 1 : 0 }).format(v);
  if (f === "pct") return `${(v * 100).toFixed(1).replace(".", ",")} %`;
  if (f === "days") return `${Math.round(v)} j`;
  return new Intl.NumberFormat("fr-FR").format(Math.round(v));
}
