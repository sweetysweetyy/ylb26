import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { contactsQuery, documentsQuery } from "@/skyachat/lib/queries";
import type { Contact } from "@/skyachat/lib/doc";
import { Button } from "@/skyachat/components/ui/button";
import { Card } from "@/skyachat/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/skyachat/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts — SkyAchat" },
      { name: "description", content: "Gérez vos clients et fournisseurs : création, modification, suppression, export." },
      { property: "og:title", content: "Contacts — SkyAchat" },
      { property: "og:description", content: "Gérez vos clients et fournisseurs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactsPage,
});

type Form = Omit<Contact, "id" | "user_id" | "created_at" | "updated_at">;
const empty: Form = { kind: "fournisseur", company: "", contact_name: "", email: "", phone: "", address: "", zip: "", city: "", country: "France", siret: "", vat_number: "", payment_terms: "", notes: "" };
const KIND = { client: "Client", fournisseur: "Fournisseur", both: "Client & fournisseur" } as const;

function ContactsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(contactsQuery);
  const { data: docs = [] } = useQuery(documentsQuery());
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [editing, setEditing] = useState<{ id?: string; form: Form } | null>(null);
  const [toDelete, setToDelete] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return data.filter(
      (c) =>
        (kind === "all" || c.kind === kind) &&
        [c.company, c.contact_name, c.email, c.city, c.siret].some((v) => (v ?? "").toLowerCase().includes(s)),
    );
  }, [data, q, kind]);

  const save = useMutation({
    mutationFn: async ({ id, form }: { id?: string; form: Form }) => {
      if (!(form.company ?? "").trim() && !(form.contact_name ?? "").trim()) throw new Error("Indiquez une société ou un nom.");
      const { error } = id ? await supabase.from("sa_contacts").update(form).eq("id", id) : await supabase.from("sa_contacts").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact enregistré");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["sa-contacts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sa_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact supprimé");
      qc.invalidateQueries({ queryKey: ["sa-contacts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportCsv() {
    const cols: (keyof Form)[] = ["kind", "company", "contact_name", "email", "phone", "address", "zip", "city", "country", "siret", "vat_number"];
    const rows = [cols.join(";"), ...filtered.map((c) => cols.map((k) => `"${String(c[k] ?? "").replace(/"/g, '""')}"`).join(";"))];
    const blob = new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contacts.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  }

  const f = editing?.form;
  const set = (k: keyof Form, v: string) => setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Contacts</h1>
          <p className="text-sm text-muted-foreground">{data.length} contact(s) — clients et fournisseurs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />Exporter CSV</Button>
          <Button onClick={() => setEditing({ form: { ...empty } })}><Plus className="mr-1 h-4 w-4" />Nouveau contact</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher (société, nom, e-mail, ville, SIRET)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="fournisseur">Fournisseurs</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
            <SelectItem value="both">Client & fournisseur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="p-3">Société</th><th className="p-3">Contact</th><th className="p-3">Coordonnées</th><th className="p-3">Type</th><th className="p-3">Docs</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Aucun contact.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="p-3"><p className="font-medium">{c.company || "—"}</p><p className="text-xs text-muted-foreground">{[c.zip, c.city].filter(Boolean).join(" ")}</p></td>
                <td className="p-3">{c.contact_name || "—"}</td>
                <td className="p-3 text-xs"><p>{c.email}</p><p className="text-muted-foreground">{c.phone}</p></td>
                <td className="p-3"><span className="rounded bg-secondary px-2 py-0.5 text-xs">{KIND[c.kind ?? "client"]}</span></td>
                <td className="p-3 text-muted-foreground">{docs.filter((d) => d.contact_id === c.id).length}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => { const { id, user_id: _u, created_at: _c, updated_at: _up, ...form } = c; setEditing({ id, form }); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Dupliquer" onClick={() => { const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...form } = c; setEditing({ form: { ...form, company: form.company + " (copie)" } }); }}><Copy className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Modifier le contact" : "Nouveau contact"}</DialogTitle></DialogHeader>
          {f && (
            <form id="contact-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(editing!); }}>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Type</Label>
                <Select value={f.kind ?? undefined} onValueChange={(v) => set("kind", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fournisseur">Fournisseur</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="both">Client & fournisseur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {([["company", "Société"], ["contact_name", "Nom du contact"], ["email", "E-mail"], ["phone", "Téléphone"], ["address", "Adresse"], ["zip", "Code postal"], ["city", "Ville"], ["country", "Pays"], ["siret", "SIRET"], ["vat_number", "N° TVA intracom."], ["payment_terms", "Conditions de paiement"]] as [keyof Form, string][]).map(([k, l]) => (
                <div key={k} className={`space-y-1.5 ${k === "address" || k === "payment_terms" ? "sm:col-span-2" : ""}`}>
                  <Label>{l}</Label>
                  <Input value={String(f[k] ?? "")} onChange={(e) => set(k, e.target.value)} maxLength={300} type={k === "email" ? "email" : "text"} />
                </div>
              ))}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes internes</Label>
                <Textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} maxLength={2000} />
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button type="submit" form="contact-form" disabled={save.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {toDelete?.company || toDelete?.contact_name} ?</AlertDialogTitle>
            <AlertDialogDescription>Les documents existants conservent les coordonnées enregistrées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
