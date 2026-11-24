import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Block, ChartBlock, TableBlock } from "@/businessplan/lib/plan-schema";
import { compact, formatCell, formatNumber, isNumericColumn } from "@/businessplan/lib/format";

type Palette = { primary: string; accent: string; ink: string };

export function chartPalette(brand: Palette) {
  return [brand.primary, "#F2A65A", "#5B8DEF", "#E4739B", "#3FB8AF", "#8E6FE8"];
}

export function DataTable({ block, currency, brand }: { block: TableBlock; currency?: string; brand: Palette }) {
  const numericCols = block.columns.map((_, i) => (i === 0 ? false : isNumericColumn(block.rows, i)));
  const totals = new Set(block.totalRowIndexes ?? []);

  return (
    <figure className="avoid-break my-6">
      {block.title ? (
        <figcaption className="mb-2 text-[0.95rem] font-semibold" style={{ color: brand.ink }}>
          {block.title}
          {block.unit ? <span className="ml-2 text-xs font-normal opacity-60">({block.unit})</span> : null}
        </figcaption>
      ) : null}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: `${brand.primary}22` }}>
        <table className="w-full border-collapse text-[0.82rem]">
          <thead>
            <tr style={{ background: `${brand.primary}0F` }}>
              {block.columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-3 py-2.5 font-semibold ${numericCols[i] ? "text-right" : "text-left"}`}
                  style={{ color: brand.primary }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => {
              const isTotal =
                totals.has(r) || /^(total|résultat net|somme|totaux)/i.test(String(row[0] ?? ""));
              return (
                <tr
                  key={r}
                  style={{
                    background: isTotal ? `${brand.accent}66` : r % 2 ? `${brand.primary}06` : "transparent",
                    borderTop: `1px solid ${brand.primary}12`,
                  }}
                >
                  {block.columns.map((_, c) => {
                    const value = row[c] ?? "";
                    const negative = typeof value === "number" && value < 0;
                    return (
                      <td
                        key={c}
                        className={`px-3 py-2 ${numericCols[c] ? "text-right tabular-nums" : "text-left"} ${
                          isTotal ? "font-semibold" : ""
                        }`}
                        style={{ color: negative ? "#C0392B" : brand.ink }}
                      >
                        {formatCell(value, numericCols[c] && currency && Math.abs(Number(value)) > 99 ? currency : undefined)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {block.note ? <p className="mt-2 text-xs opacity-60">{block.note}</p> : null}
    </figure>
  );
}

export function PlanChart({ block, brand }: { block: ChartBlock; brand: Palette }) {
  const colors = chartPalette(brand);
  const axis = { fontSize: 11, fill: `${brand.ink}99` } as const;

  const body = () => {
    if (block.chart === "pie") {
      const key = block.series[0]?.key ?? "value";
      return (
        <PieChart>
          <Tooltip formatter={(v: number) => formatNumber(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Pie
            data={block.data}
            dataKey={key}
            nameKey={block.xKey}
            innerRadius="45%"
            outerRadius="78%"
            paddingAngle={2}
          >
            {block.data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      );
    }
    if (block.chart === "line") {
      return (
        <LineChart data={block.data}>
          <CartesianGrid strokeDasharray="3 3" stroke={`${brand.ink}14`} vertical={false} />
          <XAxis dataKey={block.xKey} tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={54} />
          <Tooltip formatter={(v: number) => formatNumber(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {block.series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors[i % colors.length]}
              strokeWidth={2.4}
              dot={{ r: 2.5 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      );
    }
    if (block.chart === "area") {
      return (
        <AreaChart data={block.data}>
          <defs>
            {block.series.map((s, i) => (
              <linearGradient key={s.key} id={`grad-${block.title}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.45} />
                <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0.03} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={`${brand.ink}14`} vertical={false} />
          <XAxis dataKey={block.xKey} tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={54} />
          <Tooltip formatter={(v: number) => formatNumber(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {block.series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors[i % colors.length]}
              fill={`url(#grad-${block.title}-${s.key})`}
              strokeWidth={2.2}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      );
    }
    return (
      <BarChart data={block.data}>
        <CartesianGrid strokeDasharray="3 3" stroke={`${brand.ink}14`} vertical={false} />
        <XAxis dataKey={block.xKey} tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={54} />
        <Tooltip formatter={(v: number) => formatNumber(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {block.series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            {...(block.chart === "stackedBar" ? { stackId: "a" } : {})}
            fill={colors[i % colors.length]}
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    );
  };

  return (
    <figure className="avoid-break my-6 rounded-xl border p-4" style={{ borderColor: `${brand.primary}1F` }}>
      <figcaption className="mb-3 text-[0.95rem] font-semibold" style={{ color: brand.ink }}>
        {block.title}
        {block.unit ? <span className="ml-2 text-xs font-normal opacity-60">({block.unit})</span> : null}
      </figcaption>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {body()}
        </ResponsiveContainer>
      </div>
      {block.insight ? (
        <p className="mt-3 text-xs leading-relaxed opacity-70">
          <span className="font-semibold" style={{ color: brand.primary }}>
            Lecture :{" "}
          </span>
          {block.insight}
        </p>
      ) : null}
    </figure>
  );
}

export function BlockRenderer({
  block,
  brand,
  currency,
}: {
  block: Block;
  brand: Palette;
  currency?: string;
}) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="my-3 text-[0.92rem] leading-[1.75]" style={{ color: `${brand.ink}E6` }}>
          {block.text}
        </p>
      );
    case "bullets":
      return (
        <ul className="my-3 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[0.92rem] leading-[1.7]" style={{ color: `${brand.ink}E6` }}>
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: brand.primary }}
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "kpis":
      return (
        <div className="avoid-break my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((kpi, i) => (
            <div
              key={i}
              className="rounded-xl border p-4"
              style={{ borderColor: `${brand.primary}1F`, background: `${brand.accent}33` }}
            >
              <p className="text-[0.7rem] font-medium uppercase tracking-wider opacity-60">{kpi.label}</p>
              <p className="mt-1 text-xl font-semibold" style={{ color: brand.primary }}>
                {kpi.value}
              </p>
              {kpi.note ? <p className="mt-1 text-xs opacity-60">{kpi.note}</p> : null}
            </div>
          ))}
        </div>
      );
    case "callout":
      return (
        <aside
          className="avoid-break my-5 rounded-xl border-l-4 p-4"
          style={{
            borderColor: block.tone === "warning" ? "#E0A458" : brand.primary,
            background: `${brand.primary}08`,
          }}
        >
          <p className="text-sm font-semibold" style={{ color: brand.primary }}>
            {block.title}
          </p>
          <p className="mt-1 text-[0.88rem] leading-relaxed" style={{ color: `${brand.ink}CC` }}>
            {block.text}
          </p>
        </aside>
      );
    case "table":
      return <DataTable block={block} brand={brand} {...(currency ? { currency } : {})} />;
    case "chart":
      return <PlanChart block={block} brand={brand} />;
    default:
      return null;
  }
}
