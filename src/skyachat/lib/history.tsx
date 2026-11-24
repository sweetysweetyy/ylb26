import { useEffect, useState } from "react";
import { History } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export type HistEntry = { at: string; label: string };
const db = () => supabase as unknown as SupabaseClient;
const TABLE = "sa_documents";

/** Appends a timestamped event to the document's history (best effort, never blocks the action). */
export async function logHistory(id: string, label: string) {
  try {
    const { data } = await db().from(TABLE).select("history").eq("id", id).single();
    const history = [...(((data as { history?: HistEntry[] } | null)?.history) ?? []), { at: new Date().toISOString(), label }];
    await db().from(TABLE).update({ history }).eq("id", id);
  } catch { /* ignore */ }
}

export function DocHistory({ id, refreshKey, createdAt }: { id: string; refreshKey: unknown; createdAt?: string }) {
  const [items, setItems] = useState<HistEntry[]>([]);
  useEffect(() => {
    db().from(TABLE).select("history").eq("id", id).single().then(({ data }) => setItems(((data as { history?: HistEntry[] } | null)?.history) ?? []));
  }, [id, refreshKey]);
  const list = items.length ? items : createdAt ? [{ at: createdAt, label: "Document créé" }] : [];
  return (
    <Card className="p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg"><History className="h-4 w-4" /> Historique</h2>
      {list.length === 0 ? <p className="text-sm text-muted-foreground">Aucun événement.</p> : (
        <ol className="space-y-2 border-l pl-4 text-sm">
          {[...list].reverse().map((h, i) => (
            <li key={i}><span className="text-muted-foreground">{new Date(h.at).toLocaleString("fr-FR")}</span> — {h.label}</li>
          ))}
        </ol>
      )}
    </Card>
  );
}
