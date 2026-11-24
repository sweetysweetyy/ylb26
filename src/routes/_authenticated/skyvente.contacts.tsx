import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Download, FilePlus, Mail, Pencil, Phone, Plus, Search, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/skyvente/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, PageHeader } from "@/skyvente/components/AppShell";
import { sb } from "@/skyvente/lib/supabase";
import type { Contact } from "@/skyvente/lib/types";

export const Route = createFileRoute("/_authenticated/skyvente/contacts")({ component: Contacts });

const EMPTY: Partial<Contact> = { kind: "company", country: "France" };

const display = (c: Contact) => c.company || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Sans nom";

function Contacts() {
  const [items, setItems] = useState<Contact[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "company" | "individual">("all");
  const [edit, setEdit] = useState<Partial<Contact> | null>(null);

  const load = () => sb().from("sv_contacts").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems((data as Contact[]) || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit) return;
    if (!edit.company && !edit.last_name && !edit.first_name) return void toast.error("Nom ou société requis");
    const { id, created_at: _c, ...row } = edit as Contact;
    const res = id ? await sb().from("sv_contacts").update(row).eq("id", id) : await sb().from("sv_contacts").insert(row);
    if (res.error) return void toast.error(res.error.message);
    toast.success("Contact enregistré");
    setEdit(null);
    load();
  };

  const del = async (c: Contact) => {
    if (!confirm(`Supprimer ${display(c)} ?`)) return;
    const { error } = await sb().from("sv_contacts").delete().eq("id", c.id);
    if (error) return void toast.error(error.message);
    load();
  };

  const exportCsv = () => {
    const cols: (keyof Contact)[] = ["company", "first_name", "last_name", "email", "phone", "address", "zip", "city", "country", "siret", "vat_number", "tags"];
    const csv = [cols.join(";"), ...items.map((c) => cols.map((k) => `"${String(c[k] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "contacts.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const filtered = items.filter((c) =>
    (kind === "all" || c.kind === kind) &&
    `${display(c)} ${c.email} ${c.city} ${c.tags}`.toLowerCase().includes(q.toLowerCase()),
  );
  const set = (k: keyof Contact, v: string) => setEdit((e) => ({ ...e, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${items.length} contact(s)`}
        actions={<>
          <Button variant="glass" onClick={exportCsv}><Download /> Export CSV</Button>
          <Button variant="holo" onClick={() => setEdit({ ...EMPTY })}><Plus /> Nouveau contact</Button>
        </>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input className="sv-field pl-9" placeholder="Rechercher nom, e-mail, ville, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {(["all", "company", "individual"] as const).map((k) => (
          <Button key={k} size="sm" variant={kind === k ? "secondary" : "ghost"} onClick={() => setKind(k)}>
            {k === "all" ? "Tous" : k === "company" ? "Entreprises" : "Particuliers"}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="sv-bento p-5">
            <div className="flex items-center gap-3">
              <div className="sv-bg-holo grid size-10 place-items-center rounded-xl text-primary-foreground">
                {c.kind === "company" ? <Building2 className="size-5" /> : <User className="size-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-bold">{display(c)}</h3>
                {c.company && (c.first_name || c.last_name) && <div className="text-xs text-muted-foreground">{c.first_name} {c.last_name}</div>}
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              {c.email && <div className="flex items-center gap-2"><Mail className="size-3.5" />{c.email}</div>}
              {c.phone && <div className="flex items-center gap-2"><Phone className="size-3.5" />{c.phone}</div>}
              {c.city && <div>{c.zip} {c.city}</div>}
              {c.tags && <div className="flex flex-wrap gap-1 pt-1">{c.tags.split(",").map((t) => <span key={t} className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">{t.trim()}</span>)}</div>}
            </div>
            <div className="mt-4 flex gap-1">
              <Button size="sm" variant="ghost" asChild><Link to="/skyvente/documents/new" search={{ contact: c.id }}><FilePlus /> Devis</Link></Button>
              <Button size="sm" variant="ghost" onClick={() => setEdit(c)}><Pencil /></Button>
              <Button size="sm" variant="ghost" onClick={() => del(c)}><Trash2 /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucun contact.</p>}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sv-glass max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier le contact" : "Nouveau contact"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" className="col-span-2">
                <select className="sv-field" value={edit.kind} onChange={(e) => set("kind", e.target.value)}>
                  <option value="company">Entreprise</option><option value="individual">Particulier</option>
                </select>
              </Field>
              {edit.kind === "company" && <Field label="Société" className="col-span-2"><input className="sv-field" value={edit.company ?? ""} onChange={(e) => set("company", e.target.value)} /></Field>}
              <Field label="Prénom"><input className="sv-field" value={edit.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} /></Field>
              <Field label="Nom"><input className="sv-field" value={edit.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} /></Field>
              <Field label="E-mail"><input type="email" className="sv-field" value={edit.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Téléphone"><input className="sv-field" value={edit.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Adresse" className="col-span-2"><input className="sv-field" value={edit.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
              <Field label="Code postal"><input className="sv-field" value={edit.zip ?? ""} onChange={(e) => set("zip", e.target.value)} /></Field>
              <Field label="Ville"><input className="sv-field" value={edit.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="Pays"><input className="sv-field" value={edit.country ?? ""} onChange={(e) => set("country", e.target.value)} /></Field>
              <Field label="Tags (séparés par des virgules)"><input className="sv-field" value={edit.tags ?? ""} onChange={(e) => set("tags", e.target.value)} /></Field>
              {edit.kind === "company" && <>
                <Field label="SIRET"><input className="sv-field" value={edit.siret ?? ""} onChange={(e) => set("siret", e.target.value)} /></Field>
                <Field label="N° TVA intracom."><input className="sv-field" value={edit.vat_number ?? ""} onChange={(e) => set("vat_number", e.target.value)} /></Field>
              </>}
              <Field label="Notes internes" className="col-span-2"><textarea rows={3} className="sv-field" value={edit.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
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
