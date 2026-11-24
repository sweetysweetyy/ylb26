export function formatNumber(value: number, currency?: string) {
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 1000 ? 0 : 2;
  if (currency) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits,
    }).format(value);
  }
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}

export function formatCell(value: string | number, currency?: string) {
  if (typeof value === "number") return formatNumber(value, currency);
  return value;
}

export function compact(value: number) {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

export function isNumericColumn(rows: (string | number)[][], index: number) {
  const values = rows.map((r) => r[index]).filter((v) => v !== undefined && v !== null && v !== "");
  if (!values.length) return false;
  return values.every((v) => typeof v === "number" || /^-?[\d\s.,]+\s?%?$/.test(String(v)));
}
