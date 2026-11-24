import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Lightbulb, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/financierplan/components/ui/badge";
import { Card } from "@/financierplan/components/ui/card";
import type { SectionContent, SectionDef } from "@/financierplan/lib/sections";

export function SectionView({
  def,
  content,
  version,
}: {
  def: SectionDef;
  content: SectionContent;
  version?: number;
}) {
  const chartData =
    content.chart?.labels.map((label, i) => {
      const row: Record<string, string | number> = { label };
      content.chart!.series.forEach((s) => {
        row[s.name] = s.data[i] ?? 0;
      });
      return row;
    }) ?? [];

  return (
    <motion.div
      key={def.key + (version ?? 0)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Volet {def.index} / 12
          </p>
          <h2 className="font-display text-2xl font-semibold">{def.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{def.description}</p>
        </div>
        {version && version > 1 && <Badge variant="soft">Version {version}</Badge>}
      </div>

      {content.summary && (
        <Card variant="bento" className="p-6">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Sparkles className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Synthèse exécutive
            </span>
          </div>
          <p className="text-[15px] leading-relaxed">{content.summary}</p>
        </Card>
      )}

      {!!content.kpis?.length && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {content.kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label + i}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.04 * i, duration: 0.35 }}
            >
              <Card variant="bento" className="h-full p-5">
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="mt-2 font-display text-2xl font-semibold holo-text">{kpi.value}</p>
                {kpi.hint && <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>}
                {kpi.trend && kpi.trend !== "flat" && (
                  <div
                    className={
                      kpi.trend === "up"
                        ? "mt-3 inline-flex items-center gap-1 text-xs text-success"
                        : "mt-3 inline-flex items-center gap-1 text-xs text-destructive"
                    }
                  >
                    {kpi.trend === "up" ? (
                      <TrendingUp className="size-3.5" />
                    ) : (
                      <TrendingDown className="size-3.5" />
                    )}
                    tendance
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {content.chart && chartData.length > 0 && (
        <Card variant="bento" className="p-6">
          <p className="mb-4 font-display text-sm font-semibold">{content.chart.title}</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {content.chart.type === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <RTooltip />
                  {content.chart.series.map((s, i) => (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={`var(--chart-${(i % 5) + 1})`}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <RTooltip />
                  {content.chart.series.map((s, i) => (
                    <Bar
                      key={s.name}
                      dataKey={s.name}
                      fill={`var(--chart-${(i % 5) + 1})`}
                      radius={[6, 6, 0, 0]}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {(content.tables ?? []).map((table, i) => (
        <Card variant="bento" key={table.title + i} className="overflow-hidden">
          <div className="border-b border-border/60 px-6 py-4">
            <p className="font-display text-sm font-semibold">{table.title}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  {table.columns.map((c) => (
                    <th
                      key={c}
                      className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, r) => (
                  <tr key={r} className="border-t border-border/50 hover:bg-secondary/25">
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={
                          c === 0
                            ? "px-4 py-2.5 font-medium"
                            : "px-4 py-2.5 tabular-nums text-foreground/85"
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.note && (
            <p className="border-t border-border/50 px-6 py-3 text-xs text-muted-foreground">
              {table.note}
            </p>
          )}
        </Card>
      ))}

      {content.narrative && (
        <Card variant="bento" className="p-6">
          <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/85 prose-strong:text-foreground prose-li:text-foreground/85">
            <ReactMarkdown>{content.narrative}</ReactMarkdown>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {!!content.assumptions?.length && (
          <Card variant="bento" className="p-6">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Target className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Hypothèses</span>
            </div>
            <ul className="space-y-2 text-sm text-foreground/85">
              {content.assumptions.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full holo-gradient" />
                  {a}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {!!content.recommendations?.length && (
          <Card variant="bento" className="p-6">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Lightbulb className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Recommandations
              </span>
            </div>
            <ul className="space-y-2 text-sm text-foreground/85">
              {content.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary" />
                  {r}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
