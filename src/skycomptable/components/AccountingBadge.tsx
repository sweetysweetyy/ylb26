import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { linkedEntry, postInvoiceToAccounting, type BridgeDoc, type BridgeSource } from "@/skycomptable/lib/bridge";

/** Badge vert « VT-2026-0004 » (lien vers l'écriture) ou bouton « À comptabiliser ». */
export function AccountingBadge({ source, doc, refreshKey }: { source: BridgeSource; doc: BridgeDoc; refreshKey?: unknown }) {
  const [entry, setEntry] = useState<{ id: string; entry_number: string | null } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void linkedEntry(source, doc.id).then(setEntry); }, [source, doc.id, refreshKey]);
  if (entry === undefined) return null;
  if (entry) {
    return (
      <Link to="/skycomptable/ecritures" search={{ entry: entry.id }}
        className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20">
        Comptabilisée · {entry.entry_number ?? "écriture"}
      </Link>
    );
  }
  const post = async () => {
    setBusy(true);
    const r = await postInvoiceToAccounting(source, doc);
    setBusy(false);
    if (!r.ok) return void toast.error(r.reason);
    toast.success(`Écriture ${r.number} créée`);
    setEntry(await linkedEntry(source, doc.id));
  };
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs">
      À comptabiliser
      <button type="button" disabled={busy} onClick={post} className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50">
        {busy ? "…" : "Comptabiliser"}
      </button>
    </span>
  );
}

/** Comptabilisation automatique silencieuse : prévient seulement si le paramétrage est incomplet. */
export async function autoPost(source: BridgeSource, doc: BridgeDoc) {
  const r = await postInvoiceToAccounting(source, doc);
  if (r.ok) toast.success(`Comptabilisée : ${r.number}`);
  else toast.warning(`Facture validée, à comptabiliser : ${r.reason}`);
}
