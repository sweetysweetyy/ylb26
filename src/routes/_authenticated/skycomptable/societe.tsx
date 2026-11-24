import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/skycomptable/lib/supabase";
import { useCompany, type Company } from "@/skycomptable/lib/session";
import { PageHeader } from "@/skycomptable/components/CrudTable";
import { Button } from "@/skycomptable/components/ui/button";
import { Input } from "@/skycomptable/components/ui/input";
import { Label } from "@/skycomptable/components/ui/label";

export const Route = createFileRoute("/_authenticated/skycomptable/societe")({
  head: () => ({
    meta: [
      { title: "Société — Registre" },
      { name: "description", content: "Informations de la société." },
      { property: "og:title", content: "Société — Registre" },
      { property: "og:description", content: "Informations de la société." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const fields: { k: keyof Company; label: string }[] = [
  { k: "name", label: "Nom" },
  { k: "legal_name", label: "Raison sociale" },
  { k: "siret", label: "SIRET" },
  { k: "vat_number", label: "N° TVA intracommunautaire" },
  { k: "territory_code", label: "Territoire" },
];

function Page() {
  const { data } = useCompany();
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Company>>({});
  useEffect(() => { if (data) setForm(data.company); }, [data]);
  const isOwner = data?.role === "owner";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("skc_companies").update({
      name: form.name, legal_name: form.legal_name || null, siret: form.siret || null,
      vat_number: form.vat_number || null, territory_code: form.territory_code,
    }).eq("id", data!.company.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Enregistré");
    qc.invalidateQueries({ queryKey: ["company"] });
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Société" subtitle={isOwner ? undefined : "Seul le propriétaire peut modifier ces informations."} />
      <form onSubmit={save} className="grid gap-3">
        {fields.map((f) => (
          <div key={f.k} className="grid gap-1">
            <Label htmlFor={f.k}>{f.label}</Label>
            <Input id={f.k} disabled={!isOwner} value={(form[f.k] as string) ?? ""} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
          </div>
        ))}
        {isOwner && <Button className="w-fit">Enregistrer</Button>}
      </form>
      {isOwner && <Members companyId={data!.company.id} />}
    </div>
  );
}

const roles = { owner: "Propriétaire", accountant: "Comptable", viewer: "Lecture seule" } as Record<string, string>;

function Members({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("accountant");
  const [busy, setBusy] = useState(false);
  const members = useQuery({
    queryKey: ["members", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("skc_list_company_members", { p_company_id: companyId });
      if (error) throw error;
      return data as { membership_id: string; email: string; role: string; status: string }[];
    },
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("skc_add_company_member", { p_company_id: companyId, p_email: email, p_role: role });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Membre ajouté");
    setEmail("");
    qc.invalidateQueries({ queryKey: ["members", companyId] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("skc_company_memberships").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["members", companyId] });
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold">Membres</h2>
      {members.error && <p className="text-sm text-destructive">{(members.error as Error).message}</p>}
      <ul className="divide-y divide-border rounded-md border border-border">
        {members.data?.map((m) => (
          <li key={m.membership_id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="truncate">{m.email}</span>
            <span className="flex items-center gap-3 text-muted-foreground">
              {roles[m.role] ?? m.role}{m.status !== "active" && " (inactif)"}
              {m.role !== "owner" && (
                <button className="text-destructive hover:underline" onClick={() => remove(m.membership_id)}>Retirer</button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="grid flex-1 gap-1">
          <Label htmlFor="m-email">E-mail du collaborateur</Label>
          <Input id="m-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="accountant">Comptable</option>
          <option value="viewer">Lecture seule</option>
        </select>
        <Button disabled={busy}>Ajouter</Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">La personne doit déjà avoir créé son compte.</p>
    </section>
  );
}
