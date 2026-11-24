import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/skyvente/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, PageHeader } from "@/skyvente/components/AppShell";
import { sb } from "@/skyvente/lib/supabase";
import { eur } from "@/skyvente/lib/calc";
import type { Service } from "@/skyvente/lib/types";

export const Route = createFileRoute("/_authenticated/skyvente/prestations")({ component: Prestations });

const EMPTY: Omit<Service, "id"> = { name: "", description: "", category: "", unit: "unité", unit_price: 0, vat_rate: 20, duration: "" };

function Prestations() {
  const [items, setItems] = useState<Service[]>([]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<Service> | null>(null);

  const load = () => sb().from("sv_services").select("*").order("name").then(({ data }) => setItems((data as Service[]) || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit?.name) return void toast.error("Le nom est requis");
    const { id, created_at: _c, ...row } = edit as Service;
    const res = id ? await sb().from("sv_services").update(row).eq("id", id) : await sb().from("sv_services").insert(row);
    if (res.error) return void toast.error(res.error.message);
    toast.success("Prestation enregistrée");
    setEdit(null);
    load();
  };

  const del = async (s: Service) => {
    if (!confirm(`Supprimer « ${s.name} » ?`)) return;
    const { error } = await sb().from("sv_services").delete().eq("id", s.id);
    if (error) return void toast.error(error.message);
    load();
  };

  const filtered = items.filter((s) => `${s.name} ${s.category} ${s.description}`.toLowerCase().includes(q.toLowerCase()));
  const set = (k: keyof Service, v: string | number) => setEdit((e) => ({ ...e, [k]: v }));

  return (
    <div>
      <PageHeader title="Prestations" subtitle="Votre catalogue de services" actions={<Button variant="holo" onClick={() => setEdit({ ...EMPTY })}><Plus /> Nouvelle prestation</Button>} />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <input className="sv-field pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <div key={s.id} className="sv-bento flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                {s.category && <div className="text-xs text-primary">{s.category}</div>}
                <h3 className="text-lg font-bold">{s.name}</h3>
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-bold">{eur(s.unit_price)}</div>
                <div className="text-xs text-muted-foreground">HT / {s.unit} · TVA {s.vat_rate}%</div>
              </div>
            </div>
            {s.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>}
            {s.duration && <p className="mt-1 text-xs text-muted-foreground">Durée : {s.duration}</p>}
            <div className="mt-auto flex gap-1 pt-4">
              <Button size="sm" variant="ghost" onClick={() => setEdit(s)}><Pencil /> Modifier</Button>
              <Button size="sm" variant="ghost" onClick={() => setEdit({ ...s, id: undefined, name: s.name + " (copie)" })}><Copy /></Button>
              <Button size="sm" variant="ghost" onClick={() => del(s)}><Trash2 /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucune prestation.</p>}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sv-glass max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier la prestation" : "Nouvelle prestation"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom *" className="col-span-2"><input className="sv-field" value={edit.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Catégorie"><input className="sv-field" value={edit.category ?? ""} onChange={(e) => set("category", e.target.value)} /></Field>
              <Field label="Durée / délai"><input className="sv-field" value={edit.duration ?? ""} onChange={(e) => set("duration", e.target.value)} /></Field>
              <Field label="Description détaillée" className="col-span-2"><textarea rows={4} className="sv-field" value={edit.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
              <Field label="Prix unitaire HT (€)"><input type="number" step="0.01" className="sv-field" value={edit.unit_price ?? 0} onChange={(e) => set("unit_price", Number(e.target.value))} /></Field>
              <Field label="Unité">
                <select className="sv-field" value={edit.unit ?? "unité"} onChange={(e) => set("unit", e.target.value)}>
                  {["unité", "heure", "jour", "forfait", "mois", "page", "km"].map((u) => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="TVA (%)">
                <select className="sv-field" value={edit.vat_rate ?? 20} onChange={(e) => set("vat_rate", Number(e.target.value))}>
                  {[20, 10, 5.5, 2.1, 0].map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
              </Field>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEdit(null)}>Annuler</Button>
                <Button variant="holo" onClick={save}>Enregistrer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
