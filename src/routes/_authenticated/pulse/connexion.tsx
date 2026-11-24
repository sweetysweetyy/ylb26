import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ODOO_SCOPES, saveOdooConnection, syncOdoo } from "@/pulse/lib/odoo.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/pulse/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion Odoo — Pulse" },
      { name: "description", content: "Reliez votre base Odoo en lecture seule à votre cockpit Pulse." },
      { property: "og:title", content: "Connexion Odoo — Pulse" },
      { property: "og:description", content: "Configurez l'accès à vos modules Ventes, Achats, Facturation et CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnexionPage,
});

function ConnexionPage() {
  const save = useServerFn(saveOdooConnection);
  const sync = useServerFn(syncOdoo);
  const navigate = useNavigate();
  const [f, setF] = useState({ url: "", db: "", login: "", api_key: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("odoo_connections").select("url, db, username").maybeSingle().then(({ data }) => data && setF((p) => ({ ...p, url: data.url, db: data.db, login: data.username })));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: f });
      toast.success("Connexion Odoo validée, import en cours…");
      await sync();
      navigate({ to: "/pulse" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof typeof f, label: string, ph: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} required placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/pulse" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Cockpit</Link>
      <h1 className="mt-4 text-3xl font-semibold">Connecter votre base Odoo</h1>
      <p className="mt-2 text-muted-foreground">Accès en lecture seule via l'API externe d'Odoo (version 14 et +). Connexion partagée avec les Paramètres du Laboratoire : la saisir ici ou là-bas met à jour les deux.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_340px]">
        <form onSubmit={submit} className="pls-panel space-y-4 p-6">
          {field("url", "URL de l'instance", "https://monentreprise.odoo.com")}
          {field("db", "Nom de la base de données", "monentreprise")}
          {field("login", "Identifiant (email)", "admin@monentreprise.com")}
          {field("api_key", "Clé API", "Préférences → Sécurité du compte → Nouvelle clé API", "password")}
          <Button className="w-full" disabled={busy}>{busy ? "Vérification et import…" : "Tester et importer"}</Button>
        </form>
        <aside className="pls-panel p-6">
          <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-pls-positive" /> Données lues</div>
          <ul className="mt-4 space-y-3">
            {ODOO_SCOPES.map((s) => (
              <li key={s.model}>
                <div className="font-mono text-xs text-primary">{s.model}</div>
                <div className="text-xs text-muted-foreground">{s.why}</div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Aucune écriture n'est effectuée dans Odoo. Les modules absents sont simplement ignorés.</p>
        </aside>
      </div>
    </main>
  );
}
