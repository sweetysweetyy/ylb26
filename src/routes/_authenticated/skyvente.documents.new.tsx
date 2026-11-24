import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/skyvente/components/ui/button";
import { PageHeader } from "@/skyvente/components/AppShell";
import { ScaledPreview } from "@/skyvente/components/DocumentPreview";
import { sb } from "@/skyvente/lib/supabase";
import { eur } from "@/skyvente/lib/calc";
import { contactToClient, createDocument, serviceToItem } from "@/skyvente/lib/docs";
import { loadSettings } from "@/skyvente/lib/settings";
import type { Contact, Service, Settings } from "@/skyvente/lib/types";

export const Route = createFileRoute("/_authenticated/skyvente/documents/new")({
  validateSearch: (s: Record<string, unknown>) => ({ contact: typeof s.contact === "string" ? s.contact : undefined }),
  component: NewQuote,
});

function NewQuote() {
  const { contact } = Route.useSearch();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cid, setCid] = useState<string | undefined>(contact);
  const [sel, setSel] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb().from("sv_contacts").select("*").order("company").then(({ data }) => setContacts((data as Contact[]) || []));
    sb().from("sv_services").select("*").order("name").then(({ data }) => setServices((data as Service[]) || []));
    loadSettings().then(setSettings);
  }, []);

  const c = contacts.find((x) => x.id === cid);
  const items = useMemo(() => sel.map((id) => serviceToItem(services.find((s) => s.id === id)!)).filter(Boolean), [sel, services]);

  const create = async () => {
    if (!c || !settings) return void toast.error("Sélectionnez un client");
    setBusy(true);
    try {
      const d = await createDocument({ type: "quote", client: contactToClient(c), contact_id: c.id, items, settings, title: title || null });
      navigate({ to: "/skyvente/documents/$id", params: { id: d.id } });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const shown = contacts.filter((x) => `${x.company} ${x.first_name} ${x.last_name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Nouveau devis" subtitle="Choisissez le client et les prestations — tout se remplit automatiquement"
        actions={<Button variant="holo" disabled={!c || busy} onClick={create}>Créer et personnaliser →</Button>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          <div className="sv-bento p-5">
            <h3 className="mb-3 font-bold">1. Client</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input className="sv-field pl-9" placeholder="Rechercher un contact…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {shown.map((x) => (
                <button key={x.id} onClick={() => setCid(x.id)}
                  className={`rounded-xl border p-3 text-left text-sm transition ${cid === x.id ? "border-primary bg-accent" : "hover:bg-accent/40"}`}>
                  <div className="font-semibold">{contactToClient(x).name}</div>
                  <div className="text-xs text-muted-foreground">{x.email} {x.city && `· ${x.city}`}</div>
                </button>
              ))}
              {contacts.length === 0 && <p className="text-sm text-muted-foreground">Ajoutez d'abord un contact dans l'onglet Contacts.</p>}
            </div>
          </div>
          <div className="sv-bento p-5">
            <h3 className="mb-3 font-bold">2. Prestations</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((s) => {
                const on = sel.includes(s.id);
                return (
                  <button key={s.id} onClick={() => setSel(on ? sel.filter((i) => i !== s.id) : [...sel, s.id])}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm transition ${on ? "border-primary bg-accent" : "hover:bg-accent/40"}`}>
                    <div><div className="font-semibold">{s.name}</div><div className="text-xs text-muted-foreground">{eur(s.unit_price)} / {s.unit}</div></div>
                    {on && <Check className="size-4 text-primary" />}
                  </button>
                );
              })}
              {services.length === 0 && <p className="text-sm text-muted-foreground">Ajoutez d'abord des prestations.</p>}
            </div>
          </div>
          <div className="sv-bento p-5">
            <h3 className="mb-3 font-bold">3. Objet (facultatif)</h3>
            <input className="sv-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Refonte du site web" />
          </div>
        </div>
        {settings && (
          <div className="hidden xl:block">
            <ScaledPreview scale={0.55} settings={settings} doc={{
              type: "quote", number: null, status: "draft", client: c ? contactToClient(c) : { name: "" }, items,
              issue_date: new Date().toISOString(), due_date: null, intro: settings.layouts.quote.intro, notes: "",
              terms: settings.layouts.quote.terms, global_discount: 0, signature: null, title,
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
