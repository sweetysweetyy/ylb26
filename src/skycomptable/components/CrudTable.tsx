import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/skycomptable/lib/supabase";
import { canEdit, useCompany } from "@/skycomptable/lib/session";
import { Button } from "@/skycomptable/components/ui/button";
import { Input } from "@/skycomptable/components/ui/input";
import { Label } from "@/skycomptable/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/skycomptable/components/ui/dialog";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "checkbox" | "select" | "email";
  options?: { value: string; label: string }[];
  required?: boolean;
  hideInTable?: boolean;
  render?: (row: Record<string, unknown>) => ReactNode;
};

export const selectCls =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string | undefined; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function useTable<T = Record<string, unknown>>(table: string, order = "created_at") {
  const { data } = useCompany();
  const companyId = data?.company.id;
  return useQuery({
    queryKey: [table, companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("company_id", companyId!).order(order);
      if (error) throw error;
      return data as T[];
    },
  });
}

export function CrudTable({
  table,
  title,
  subtitle,
  fields,
  order,
  defaults = {},
}: {
  table: string;
  title: string;
  subtitle?: string;
  fields: Field[];
  order?: string;
  defaults?: Record<string, unknown>;
}) {
  const qc = useQueryClient();
  const { data: ctx } = useCompany();
  const editable = canEdit(ctx?.role);
  const rows = useTable(table, order);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const save = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        let v = row[f.name];
        if (f.type === "number") v = v === "" || v == null ? null : Number(v);
        if (f.type === "checkbox") v = !!v;
        if (v === "") v = null;
        payload[f.name] = v;
      }
      if (row["id"]) {
        const { error } = await supabase.from(table).update(payload).eq("id", row["id"] as string);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert({ ...payload, company_id: ctx!.company.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Enregistré");
      setEditing(null);
      qc.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const cols = fields.filter((f) => !f.hideInTable);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          editable && (
            <Button onClick={() => setEditing({ ...defaults })}>
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          )
        }
      />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {cols.map((c) => (
                <th key={c.name} className="px-3 py-2 font-medium">{c.label}</th>
              ))}
              {editable && <th className="w-20" />}
            </tr>
          </thead>
          <tbody>
            {rows.isLoading && (
              <tr><td className="px-3 py-6 text-muted-foreground" colSpan={cols.length + 1}>Chargement…</td></tr>
            )}
            {rows.error && (
              <tr><td className="px-3 py-6 text-destructive" colSpan={cols.length + 1}>{(rows.error as Error).message}</td></tr>
            )}
            {rows.data?.length === 0 && (
              <tr><td className="px-3 py-6 text-muted-foreground" colSpan={cols.length + 1}>Aucun élément pour l'instant.</td></tr>
            )}
            {rows.data?.map((r) => (
              <tr key={r["id"] as string} className="border-t border-border hover:bg-muted/50">
                {cols.map((c) => (
                  <td key={c.name} className={`px-3 py-2 ${c.type === "number" ? "num text-right" : ""}`}>
                    {c.render
                      ? c.render(r)
                      : c.type === "checkbox"
                        ? r[c.name] ? "Oui" : "—"
                        : c.type === "select"
                          ? c.options?.find((o) => o.value === r[c.name])?.label ?? "—"
                          : String(r[c.name] ?? "—")}
                  </td>
                ))}
                {editable && (
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(r)} aria-label="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Supprimer"
                      onClick={() => confirm("Supprimer cet élément ?") && remove.mutate(r["id"] as string)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing?.["id"] ? "Modifier" : "Ajouter"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(editing);
              }}
            >
              {fields.map((f) => (
                <div key={f.name} className={f.type === "checkbox" ? "flex items-center gap-2" : "grid gap-1"}>
                  {f.type === "checkbox" ? (
                    <>
                      <input
                        id={f.name}
                        type="checkbox"
                        checked={!!editing[f.name]}
                        onChange={(e) => setEditing({ ...editing, [f.name]: e.target.checked })}
                      />
                      <Label htmlFor={f.name}>{f.label}</Label>
                    </>
                  ) : (
                    <>
                      <Label htmlFor={f.name}>{f.label}</Label>
                      {f.type === "select" ? (
                        <select
                          id={f.name}
                          className={selectCls}
                          required={f.required}
                          value={(editing[f.name] as string) ?? ""}
                          onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}
                        >
                          <option value="">—</option>
                          {f.options?.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={f.name}
                          type={f.type ?? "text"}
                          step={f.type === "number" ? "any" : undefined}
                          required={f.required}
                          value={(editing[f.name] as string) ?? ""}
                          onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
              <DialogFooter>
                <Button type="submit" disabled={save.isPending}>Enregistrer</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
