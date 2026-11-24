import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from "lucide-react";
import { connectionQuery } from "@/facturodoo/lib/queries";
import { saveOdooConnection, testOdooConnection } from "@/facturodoo/lib/odoo.functions";
import type { OdooScope } from "@/facturodoo/lib/invoice-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/facturodoo/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion Odoo — FacturOdoo" },
      { name: "description", content: "Connectez votre base Odoo et vérifiez les droits requis pour Achats, Facturation et Contacts." },
      { property: "og:title", content: "Connexion Odoo — FacturOdoo" },
      { property: "og:description", content: "Connexion sécurisée à votre base Odoo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectionPage,
});

function ConnectionPage() {
  const { data: conn, isLoading } = useQuery(connectionQuery);
  const qc = useQueryClient();
  const save = useServerFn(saveOdooConnection);
  const test = useServerFn(testOdooConnection);
  const [form, setForm] = useState({ url: "", db: "", username: "", apiKey: "" });
  const [busy, setBusy] = useState<null | "save" | "test">(null);

  useEffect(() => {
    if (conn) setForm((f) => ({ ...f, url: conn.url, db: conn.db, username: conn.username }));
  }, [conn]);

  const rawScopes = conn?.modules as unknown;
  const scopes: OdooScope[] = Array.isArray(rawScopes) ? (rawScopes as OdooScope[]) : [];
  const missing = scopes.filter((s) => !s.ok);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy("save");
    try {
      const r = await save({ data: { url: form.url, db: form.db, username: form.username, apiKey: form.apiKey || undefined } });
      setForm((f) => ({ ...f, apiKey: "" }));
      qc.invalidateQueries({ queryKey: ["odoo_connection"] });
      const ko = r.scopes.filter((s) => !s.ok).length;
      toast.success(ko ? `Connecté à ${r.company ?? "Odoo"} — ${ko} droit(s) à compléter` : `Connecté à ${r.company ?? "Odoo"} — tous les droits sont OK`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function retest() {
    setBusy("test");
    try {
      const r = await test();
      qc.invalidateQueries({ queryKey: ["odoo_connection"] });
      toast.success(r.scopes.every((s) => s.ok) ? "Connexion et droits vérifiés." : "Connexion OK, certains droits manquent.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fo-fade-up">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Connexion Odoo</h1>
        <p className="mt-1 text-muted-foreground">Vos identifiants sont chiffrés et utilisés uniquement côté serveur.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <form onSubmit={submit} className="fo-surface space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="url">URL de votre Odoo</Label>
            <Input id="url" placeholder="https://monentreprise.odoo.com" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="db">Nom de la base de données</Label>
            <Input id="db" placeholder="monentreprise" value={form.db} onChange={(e) => setForm({ ...form, db: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Identifiant (e-mail Odoo)</Label>
            <Input id="username" placeholder="admin@monentreprise.com" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apiKey">Clé API Odoo {conn && <span className="font-normal text-muted-foreground">(laisser vide pour conserver l'actuelle)</span>}</Label>
            <Input id="apiKey" type="password" placeholder={conn ? "••••••••••••" : "Clé générée dans Odoo"} value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} required={!conn} />
            <p className="text-xs text-muted-foreground">
              Dans Odoo : Préférences → Sécurité du compte → Clés API → Nouvelle clé API.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={!!busy} className="fo-btn-copper">
              {busy === "save" && <Loader2 className="size-4 animate-spin" />}
              {conn ? "Mettre à jour et vérifier" : "Connecter et vérifier"}
            </Button>
            {conn && (
              <Button type="button" variant="outline" disabled={!!busy} onClick={retest}>
                {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Re-tester
              </Button>
            )}
          </div>
        </form>

        <div className="space-y-4">
          <div className="fo-surface p-6">
            <h2 className="font-semibold">État de la connexion</h2>
            {isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
            ) : conn ? (
              <dl className="mt-3 space-y-2 text-sm">
                <Row k="Base" v={conn.db} />
                <Row k="Dernière vérification" v={conn.last_tested_at ? new Date(conn.last_tested_at).toLocaleString("fr-FR") : "—"} />
                <a href={conn.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-fo-copper">
                  Ouvrir Odoo <ExternalLink className="size-3.5" />
                </a>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Aucune connexion enregistrée.</p>
            )}
          </div>

          <div className="fo-surface p-6">
            <h2 className="font-semibold">Scopes natifs Odoo requis</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Droits d'accès vérifiés sur les modèles des modules Contacts, Facturation et Achats via l'utilisateur de la clé API.
            </p>
            {scopes.length === 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Contacts — fournisseurs (lecture / création)</li>
                <li>• Facturation — factures fournisseurs & lignes</li>
                <li>• Achats — bons de commande & lignes</li>
                <li>• Produits, Taxes, Devises, Pays, Pièces jointes</li>
              </ul>
            ) : (
              <ul className="mt-3 space-y-2">
                {scopes.map((s) => (
                  <li key={s.key} className="flex items-start gap-2 text-sm">
                    {s.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-fo-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
                    <div>
                      <p className="font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.model} · {s.rights.join(", ")}{!s.ok && s.detail ? ` — ${s.detail}` : ""}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {missing.length > 0 && (
              <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                Accordez à l'utilisateur Odoo les groupes « Facturation / Comptable », « Achats / Utilisateur » et vérifiez que les modules concernés sont installés.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
