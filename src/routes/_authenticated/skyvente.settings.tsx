import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/skyvente/components/ui/button";
import { Field, PageHeader } from "@/skyvente/components/AppShell";
import { ScaledPreview } from "@/skyvente/components/DocumentPreview";
import { sb } from "@/skyvente/lib/supabase";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/skyvente/lib/settings";
import type { BlockId, Company, DocLayout, DocType, Settings } from "@/skyvente/lib/types";
import { DOC_LABEL } from "@/skyvente/lib/types";

export const Route = createFileRoute("/_authenticated/skyvente/settings")({ component: SettingsPage });

const BLOCK_LABEL: Record<BlockId, string> = {
  header: "En-tête", parties: "Émetteur / Client", meta: "Dates & objet", intro: "Introduction", items: "Tableau des prestations",
  totals: "Totaux", notes: "Notes", terms: "Conditions", signature: "Signature", custom: "Bloc de texte libre", footer: "Pied de page",
};

const SAMPLE = {
  number: "XXX-2026-0001", status: "draft", client: { name: "Client Exemple SAS", address: "1 rue de la Paix", zip: "75002", city: "Paris" },
  items: [{ id: "1", name: "Prestation exemple", description: "Détail de la prestation", quantity: 2, unit: "jour", unit_price: 450, vat_rate: 20, discount: 0 }],
  issue_date: new Date().toISOString(), due_date: new Date().toISOString(), notes: "", global_discount: 0, signature: null, title: "Projet exemple",
};

function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [tab, setTab] = useState<"company" | DocType>("company");
  useEffect(() => { loadSettings().then(setS); }, []);
  if (!s) return <div className="text-muted-foreground">Chargement…</div>;

  const co = (k: keyof Company, v: string | number | boolean) => setS({ ...s, company: { ...s.company, [k]: v } });
  const lay = (t: DocType, p: Partial<DocLayout>) => setS({ ...s, layouts: { ...s.layouts, [t]: { ...s.layouts[t], ...p } } });

  const save = async () => { try { await saveSettings(s); toast.success("Paramètres enregistrés"); } catch (e) { toast.error((e as Error).message); } };

  const uploadLogo = async (f: File) => {
    const { data: u } = await sb().auth.getUser();
    const path = `${u.user!.id}/logo-${Date.now()}.${f.name.split(".").pop()}`;
    const { error } = await sb().storage.from("skyvente-logos").upload(path, f, { upsert: true });
    if (error) return void toast.error(error.message);
    co("logo_url", sb().storage.from("skyvente-logos").getPublicUrl(path).data.publicUrl);
  };

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Entreprise et éditeur de mise en page des documents" actions={<Button variant="holo" onClick={save}>Enregistrer</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["company", "quote", "order", "invoice", "credit_note", "delivery"] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "secondary" : "ghost"} onClick={() => setTab(t)}>{t === "company" ? "Entreprise" : DOC_LABEL[t]}</Button>
        ))}
      </div>
      {tab === "company" ? (
        <div className="sv-bento grid gap-3 p-5 md:grid-cols-3">
          {([["name", "Raison sociale"], ["legal_form", "Forme juridique"], ["capital", "Capital"], ["address", "Adresse"], ["zip", "Code postal"], ["city", "Ville"], ["country", "Pays"], ["email", "E-mail"], ["phone", "Téléphone"], ["website", "Site web"], ["siret", "SIRET"], ["rcs", "RCS / RM"], ["vat_number", "N° TVA"], ["iban", "IBAN"], ["bic", "BIC"]] as [keyof Company, string][]).map(([k, l]) => (
            <Field key={k} label={l}><input className="sv-field" value={String(s.company[k] ?? "")} onChange={(e) => co(k, e.target.value)} /></Field>
          ))}
          <Field label="Délai de paiement (jours)"><input type="number" className="sv-field" value={s.company.payment_terms_days} onChange={(e) => co("payment_terms_days", Number(e.target.value))} /></Field>
          <Field label="Logo"><input type="file" accept="image/*" className="sv-field" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.company.vat_exempt} onChange={(e) => co("vat_exempt", e.target.checked)} /> Franchise de TVA (art. 293 B)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.company.is_ei} onChange={(e) => co("is_ei", e.target.checked)} /> Entrepreneur individuel (mention « EI »)</label>
          <Field label="Escompte pour paiement anticipé" className="md:col-span-3"><input className="sv-field" value={s.company.early_discount} onChange={(e) => co("early_discount", e.target.value)} /></Field>
          <Field label="Assurance RC Pro (assureur, n° de contrat, zone couverte) — obligatoire pour les activités réglementées" className="md:col-span-3"><input className="sv-field" value={s.company.insurance} onChange={(e) => co("insurance", e.target.value)} /></Field>
          <Field label="Médiateur de la consommation (clients particuliers)" className="md:col-span-3"><input className="sv-field" value={s.company.mediator} onChange={(e) => co("mediator", e.target.value)} /></Field>
          <Field label="Mentions pénalités de retard (factures)" className="md:col-span-3"><textarea rows={2} className="sv-field" value={s.company.late_penalty} onChange={(e) => co("late_penalty", e.target.value)} /></Field>
        </div>
      ) : (
        <LayoutEditor t={tab} s={s} lay={lay} reset={() => lay(tab, DEFAULT_SETTINGS.layouts[tab])} />
      )}
    </div>
  );
}

function LayoutEditor({ t, s, lay, reset }: { t: DocType; s: Settings; lay: (t: DocType, p: Partial<DocLayout>) => void; reset: () => void }) {
  const L = s.layouts[t];
  const blocks = L.blocks;
  const setBlock = (i: number, p: Partial<(typeof blocks)[number]>) => lay(t, { blocks: blocks.map((b, j) => (j === i ? { ...b, ...p } : b)) });
  const move = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= blocks.length) return;
    const n = [...blocks]; [n[i], n[j]] = [n[j], n[i]]; lay(t, { blocks: n });
  };
  return (
    <div className="grid gap-6 2xl:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <div className="sv-bento grid gap-3 p-5 sm:grid-cols-3">
          <Field label="Titre du document"><input className="sv-field" value={L.title} onChange={(e) => lay(t, { title: e.target.value })} /></Field>
          <Field label="Couleur d'accent"><input type="color" className="sv-field h-10" value={L.accent} onChange={(e) => lay(t, { accent: e.target.value })} /></Field>
          <Field label="Couleur du texte"><input type="color" className="sv-field h-10" value={L.text_color} onChange={(e) => lay(t, { text_color: e.target.value })} /></Field>
          <Field label="Police"><select className="sv-field" value={L.font} onChange={(e) => lay(t, { font: e.target.value as DocLayout["font"] })}>{["Inter", "Space Grotesk", "Georgia", "Helvetica"].map((f) => <option key={f}>{f}</option>)}</select></Field>
          <Field label="Taille du texte"><input type="number" min={8} max={16} className="sv-field" value={L.font_size} onChange={(e) => lay(t, { font_size: Number(e.target.value) })} /></Field>
          <Field label="Style d'en-tête"><select className="sv-field" value={L.header_style} onChange={(e) => lay(t, { header_style: e.target.value as DocLayout["header_style"] })}><option value="band">Bandeau couleur</option><option value="split">Partagé</option><option value="minimal">Minimal</option></select></Field>
          <Field label="Style du tableau"><select className="sv-field" value={L.table_style} onChange={(e) => lay(t, { table_style: e.target.value as DocLayout["table_style"] })}><option value="striped">Rayé</option><option value="lined">Lignes</option><option value="boxed">Encadré</option></select></Field>
          {t === "quote" && <Field label="Validité (jours)"><input type="number" className="sv-field" value={L.validity_days} onChange={(e) => lay(t, { validity_days: Number(e.target.value) })} /></Field>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={L.show_logo} onChange={(e) => lay(t, { show_logo: e.target.checked })} /> Afficher le logo</label>
          <Field label="Introduction par défaut" className="sm:col-span-3"><textarea rows={2} className="sv-field" value={L.intro} onChange={(e) => lay(t, { intro: e.target.value })} /></Field>
          <Field label="Conditions par défaut" className="sm:col-span-3"><textarea rows={2} className="sv-field" value={L.terms} onChange={(e) => lay(t, { terms: e.target.value })} /></Field>
          <Field label="Pied de page" className="sm:col-span-3"><textarea rows={2} className="sv-field" value={L.footer} onChange={(e) => lay(t, { footer: e.target.value })} /></Field>
        </div>
        <div className="sv-bento space-y-2 p-5">
          <div className="flex items-center justify-between"><h3 className="font-bold">Blocs de la page</h3><Button size="sm" variant="ghost" onClick={reset}><RotateCcw /> Réinitialiser</Button></div>
          {blocks.map((b, i) => (
            <div key={b.id} className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 ${b.visible ? "" : "opacity-50"}`}>
              <span className="w-44 text-sm font-medium">{BLOCK_LABEL[b.id]}</span>
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown /></Button>
              <Button size="icon" variant="ghost" onClick={() => setBlock(i, { visible: !b.visible })}>{b.visible ? <Eye /> : <EyeOff />}</Button>
              <select className="sv-field w-28" value={b.align ?? "left"} onChange={(e) => setBlock(i, { align: e.target.value as "left" })}><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">Espace<input type="range" min={0} max={80} value={b.spacing ?? 16} onChange={(e) => setBlock(i, { spacing: Number(e.target.value) })} /></label>
              {b.id === "custom" && <textarea rows={2} className="sv-field" placeholder="Texte libre…" value={b.text ?? ""} onChange={(e) => setBlock(i, { text: e.target.value })} />}
            </div>
          ))}
        </div>
      </div>
      <div className="2xl:sticky 2xl:top-6 2xl:self-start">
        <ScaledPreview scale={0.62} settings={s} doc={{ ...SAMPLE, type: t, intro: L.intro, terms: L.terms }} />
      </div>
    </div>
  );
}
