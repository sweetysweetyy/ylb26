import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/skyachat/lib/queries";
import type { Settings } from "@/skyachat/lib/doc";
import { Button } from "@/skyachat/components/ui/button";
import { Card } from "@/skyachat/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/skyachat/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — SkyAchat" },
      { name: "description", content: "Logo, coordonnées, mentions légales et couleurs de vos documents." },
      { property: "og:title", content: "Paramètres — SkyAchat" },
      { property: "og:description", content: "Personnalisez vos documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const FIELDS: [keyof Settings, string][] = [
  ["company_name", "Raison sociale"], ["legal_form", "Forme juridique (SAS, SARL…)"], ["capital", "Capital social"], ["rcs_city", "Ville du RCS"], ["email", "E-mail"], ["phone", "Téléphone"], ["website", "Site web"],
  ["address", "Adresse"], ["zip", "Code postal"], ["city", "Ville"], ["country", "Pays"],
  ["siret", "SIRET"], ["vat_number", "N° TVA"], ["iban", "IBAN"], ["default_payment_terms", "Conditions de paiement par défaut"],
  ["quote_prefix", "Préfixe devis"], ["order_prefix", "Préfixe commande"], ["invoice_prefix", "Préfixe facture"], ["delivery_prefix", "Préfixe réception"], ["credit_note_prefix", "Préfixe avoir"],
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (!s) return <p className="text-muted-foreground">Chargement…</p>;
  const set = (k: keyof Settings, v: string | boolean) => setS({ ...s, [k]: v });

  async function save() {
    const { created_at: _c, updated_at: _u, ...payload } = s!;
    const { error } = await supabase.from("sa_settings").upsert(payload as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Paramètres enregistrés");
    qc.invalidateQueries({ queryKey: ["sa-settings"] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-4xl">Paramètres</h1>
        <Button onClick={save}>Enregistrer</Button>
      </div>
      <Card className="space-y-4 p-6">
        <h2 className="text-xl">Identité visuelle</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="grid h-20 w-40 place-items-center rounded border bg-muted">
            {s.logo_data_url ? <img src={s.logo_data_url} alt="Logo" className="max-h-16 max-w-36" /> : <span className="text-xs text-muted-foreground">Aucun logo</span>}
          </div>
          <Input type="file" accept="image/png,image/jpeg" className="max-w-xs" onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            if (f.size > 800_000) { toast.error("Logo trop lourd (800 Ko max)."); return; }
            const r = new FileReader(); r.onload = () => set("logo_data_url", String(r.result)); r.readAsDataURL(f);
          }} />
          {s.logo_data_url && <Button variant="ghost" onClick={() => set("logo_data_url", "")}>Retirer</Button>}
          <div className="flex items-center gap-2"><Label>Couleur principale</Label><input type="color" value={s.primary_color ?? "#000000"} onChange={(e) => set("primary_color", e.target.value)} /></div>
          <div className="flex items-center gap-2"><Label>Couleur d'accent</Label><input type="color" value={s.accent_color ?? "#000000"} onChange={(e) => set("accent_color", e.target.value)} /></div>
        </div>
      </Card>
      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Coordonnées & numérotation</h2>
        {FIELDS.map(([k, l]) => (
          <div key={k} className="space-y-1.5"><Label>{l}</Label><Input value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value)} /></div>
        ))}
      </Card>
      <Card className="space-y-4 p-6">
        <h2 className="text-xl">Mentions & pieds de page</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.recovery_fee_mention} onChange={(e) => set("recovery_fee_mention", e.target.checked)} />Afficher l'indemnité forfaitaire de 40 € pour frais de recouvrement (art. D.441-5 C. com.)</label>
        {([["late_penalty_rate", "Taux des pénalités de retard"], ["early_payment_discount", "Escompte pour paiement anticipé"], ["vat_exemption_mention", "Mention d'exonération de TVA (si applicable)"], ["legal_mentions", "Mentions légales complémentaires"], ["invoice_footer", "Pied de page — facture / avoir"], ["quote_footer", "Pied de page — demande de devis"], ["order_footer", "Pied de page — bon de commande"], ["delivery_footer", "Pied de page — PV de réception"]] as [keyof Settings, string][]).map(([k, l]) => (
          <div key={k} className="space-y-1.5"><Label>{l}</Label><Textarea value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value)} /></div>
        ))}
      </Card>
    </div>
  );
}
