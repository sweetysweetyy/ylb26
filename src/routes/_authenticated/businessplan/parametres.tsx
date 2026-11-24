import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cpu, Loader2, Palette, Save, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/businessplan/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_BRAND, type Brand } from "@/businessplan/lib/plan-schema";
import { BrandEditor } from "@/businessplan/components/plan/BrandEditor";

export const Route = createFileRoute("/_authenticated/businessplan/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Plan Studio" },
      { name: "description", content: "Choisissez le modèle d'IA et l'identité visuelle appliquée par défaut à vos business plans." },
      { property: "og:title", content: "Paramètres — Plan Studio" },
      { property: "og:description", content: "Modèle d'IA et charte graphique par défaut." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const BRAND_KEY = "bp-default-brand";

function SettingsPage() {
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["bp-settings"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("no session");
      const profile = await supabase.from("profiles").select("full_name, studio_name").eq("id", userId).maybeSingle();
      const sb = supabase as unknown as { from: (t: string) => any };
      const row = await sb.from("bp_settings").select("default_brand").eq("user_id", userId).maybeSingle();
      let defaultBrand: Partial<Brand> = (row.data?.default_brand as Partial<Brand>) ?? {};
      if (!row.data) { try { defaultBrand = JSON.parse(localStorage.getItem(BRAND_KEY) || "{}"); } catch { /* ignore */ } }
      return { userId, defaultBrand, profile: profile.data };
    },
  });

  useEffect(() => {
    if (!data) return;
    setBrand({ ...DEFAULT_BRAND, ...data.defaultBrand });
    if (data.profile) {
      setFullName(data.profile.full_name ?? "");
      setCompany(data.profile.studio_name ?? "");
    }
  }, [data]);

  async function save() {
    if (!data?.userId) return;
    setSaving(true);
    try {
      localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
      const sb = supabase as unknown as { from: (t: string) => any };
      const b = await sb.from("bp_settings").upsert({ user_id: data.userId, default_brand: brand }, { onConflict: "user_id" });
      if (b.error) throw b.error;
      const { error } = await supabase.from("profiles").update({ full_name: fullName, studio_name: company }).eq("id", data.userId);
      if (error) throw error;
      toast.success("Paramètres enregistrés");
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-16">
      <PageHeader
        title="Paramètres"
        subtitle="Modèle d'analyse et identité visuelle par défaut."
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Enregistrer
          </Button>
        }
      />

      <div className="grid gap-5 px-8 py-7 lg:grid-cols-2">
        <section className="bp-card p-6">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Modèle d'intelligence artificielle</h2>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Utilisé pour analyser vos PDF et reconstruire le document.
          </p>
          <p className="mt-4 text-sm">
            Le modèle se choisit dans les réglages du Laboratoire (application « Business Plan »).{" "}
            <Link to="/settings" search={{ tab: "ia" }} className="text-primary underline">Ouvrir les réglages</Link>
          </p>
        </section>

        <div className="space-y-5">
          <section className="bp-card p-6">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Profil</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fn">Nom complet</Label>
                <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co">Société</Label>
                <Input id="co" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="bp-card p-6">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Charte graphique par défaut</h2>
            </div>
            <div className="mt-5">
              <BrandEditor brand={brand} onChange={setBrand} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
