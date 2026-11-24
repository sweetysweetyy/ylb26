import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { sb } from "./supabase";

export type HistEntry = { at: string; label: string };
const TABLE = "sv_documents";

/** Appends a timestamped event to the document's history (best effort, never blocks the action). */
export async function logHistory(id: string, label: string) {
  try {
    const { data } = await sb().from(TABLE).select("history").eq("id", id).single();
    const history = [...(((data as { history?: HistEntry[] } | null)?.history) ?? []), { at: new Date().toISOString(), label }];
    await sb().from(TABLE).update({ history }).eq("id", id);
  } catch { /* ignore */ }
}

export const firstEntry = (label: string): HistEntry[] => [{ at: new Date().toISOString(), label }];

export function DocHistory({ id, refreshKey, createdAt }: { id: string; refreshKey: unknown; createdAt?: string }) {
  const [items, setItems] = useState<HistEntry[]>([]);
  useEffect(() => {
    sb().from(TABLE).select("history").eq("id", id).single().then(({ data }) => setItems(((data as { history?: HistEntry[] } | null)?.history) ?? []));
  }, [id, refreshKey]);
  const list = items.length ? items : createdAt ? [{ at: createdAt, label: "Document créé" }] : [];
  return (
    <div className="sv-bento p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><History className="size-4" /> Historique</h2>
      {list.length === 0 ? <p className="text-sm opacity-70">Aucun événement.</p> : (
        <ol className="space-y-2 border-l pl-4 text-sm">
          {[...list].reverse().map((h, i) => (
            <li key={i}><span className="opacity-60">{new Date(h.at).toLocaleString("fr-FR")}</span> — {h.label}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
