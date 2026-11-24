import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/skycomptable/lib/supabase";

export type PaymentEntryMap = Record<string, { id: string; entry_number: string | null }>;

/** Écritures BQ liées à une liste de règlements (source_type = skyvente_payment | skyachat_payment). */
export function usePaymentEntries(sourceType: "skyvente_payment" | "skyachat_payment", ids: string[], refreshKey?: unknown) {
  const [map, setMap] = useState<PaymentEntryMap>({});
  const key = ids.join(",");
  useEffect(() => {
    if (!ids.length) { setMap({}); return; }
    void supabase.from("skc_accounting_entries").select("id, entry_number, source_id")
      .eq("source_type", sourceType).in("source_id", ids)
      .then(({ data }) => {
        const m: PaymentEntryMap = {};
        for (const e of (data ?? []) as { id: string; entry_number: string | null; source_id: string }[]) m[e.source_id] = { id: e.id, entry_number: e.entry_number };
        setMap(m);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, key, refreshKey]);
  return map;
}

export function PaymentEntryBadge({ entry, onPost }: { entry?: { id: string; entry_number: string | null }; onPost?: () => void }) {
  if (entry) {
    return (
      <Link to="/skycomptable/ecritures" search={{ entry: entry.id }}
        className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20">
        {entry.entry_number ?? "Écriture"}
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs">
      À comptabiliser
      {onPost && <button type="button" onClick={onPost} className="font-medium text-primary hover:underline">Comptabiliser</button>}
    </span>
  );
}
