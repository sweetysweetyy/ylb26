import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery } from "@/skyachat/lib/queries";
import { formatMoney, type Product } from "@/skyachat/lib/doc";
import { Button } from "@/skyachat/components/ui/button";
import { Card } from "@/skyachat/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/skyachat/products")({
  head: () => ({
    meta: [
      { title: "Produits & services — SkyAchat" },
      { name: "description", content: "Catalogue de biens et prestations réutilisables dans vos devis et commandes." },
      { property: "og:title", content: "Produits & services — SkyAchat" },
      { property: "og:description", content: "Catalogue de biens et prestations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductsPage,
});

type Form = Omit<Product, "id" | "user_id" | "created_at" | "updated_at">;
const empty: Form = { kind: "bien", reference: "", name: "", description: "", unit: "u", unit_price: 0, vat_rate: 20 };

function ProductsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(productsQuery);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ id?: string; form: Form } | null>(null);
  const filtered = useMemo(() => data.filter((p) => [p.name, p.reference, p.description].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase()))), [data, q]);

  const save = useMutation({
    mutationFn: async ({ id, form }: { id?: string; form: Form }) => {
      if (!form.name.trim()) throw new Error("Le nom est requis.");
      const payload = { ...form, unit_price: Number(form.unit_price) || 0, vat_rate: Number(form.vat_rate) || 0 };
      const { error } = id ? await supabase.from("sa_products").update(payload).eq("id", id) : await supabase.from("sa_products").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Enregistré"); setEditing(null); qc.invalidateQueries({ queryKey: ["sa-products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("sa_products").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["sa-products"] }); },
  });
  const f = editing?.form;
  const set = (k: keyof Form, v: string | number) => setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-4xl">Produits & services</h1><p className="text-sm text-muted-foreground">Votre catalogue d'achats</p></div>
        <Button onClick={() => setEditing({ form: { ...empty } })}><Plus className="mr-1 h-4 w-4" />Nouvel article</Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="p-3">Référence</th><th className="p-3">Désignation</th><th className="p-3">Type</th><th className="p-3 text-right">P.U. HT</th><th className="p-3 text-right">TVA</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Aucun article.</td></tr>}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="p-3 text-muted-foreground">{p.reference || "—"}</td>
                <td className="p-3"><p className="font-medium">{p.name}</p><p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p></td>
                <td className="p-3"><span className="rounded bg-secondary px-2 py-0.5 text-xs">{p.kind === "bien" ? "Bien" : "Service"}</span></td>
                <td className="p-3 text-right">{formatMoney(Number(p.unit_price))} / {p.unit}</td>
                <td className="p-3 text-right">{Number(p.vat_rate)}%</td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => { const { id, user_id: _u, created_at: _c, updated_at: _up, ...form } = p; setEditing({ id, form }); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => confirm("Supprimer cet article ?") && remove.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Modifier l'article" : "Nouvel article"}</DialogTitle></DialogHeader>
          {f && (
            <form id="product-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(editing!); }}>
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={f.kind ?? undefined} onValueChange={(v) => set("kind", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="bien">Bien</SelectItem><SelectItem value="service">Service / prestation</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Référence</Label><Input value={f.reference ?? ""} onChange={(e) => set("reference", e.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Désignation *</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} required /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Prix unitaire HT</Label><Input type="number" step="0.01" value={f.unit_price ?? ""} onChange={(e) => set("unit_price", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Unité</Label><Input value={f.unit ?? ""} onChange={(e) => set("unit", e.target.value)} placeholder="u, h, jour, kg…" /></div>
              <div className="space-y-1.5"><Label>TVA (%)</Label><Input type="number" step="0.1" value={f.vat_rate ?? ""} onChange={(e) => set("vat_rate", e.target.value)} /></div>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button type="submit" form="product-form" disabled={save.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
