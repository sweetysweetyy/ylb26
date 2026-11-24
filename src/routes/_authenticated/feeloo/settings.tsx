import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BentoCard } from "@/feeloo/components/bento-card";
import { Button } from "@/feeloo/components/ui/button";
import { Label } from "@/feeloo/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/feeloo/components/ui/select";
import { Switch } from "@/feeloo/components/ui/switch";
import { rematchAllFn } from "@/feeloo/lib/ai.functions";
import { getSettingsFn, saveSettingsFn } from "@/feeloo/lib/integrations.functions";
import { toast } from "sonner";

const MODELS = [
  { id: "openai/gpt-5.5", label: "GPT-5.5 (recommandé)" },
  { id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol (frontier)" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra (équilibré)" },
  { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna (rapide)" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano (volumes)" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash" },
];

export const Route = createFileRoute("/_authenticated/feeloo/settings")({
  head: () => ({ meta: [{ title: "Paramètres — TalentCortex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const get = useServerFn(getSettingsFn);
  const save = useServerFn(saveSettingsFn);
  const rematch = useServerFn(rematchAllFn);
  const [model, setModel] = useState("openai/gpt-5.5");
  const [autoSync, setAutoSync] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => { get().then((s: any) => { setModel(s.ai_model || "openai/gpt-5.5"); setAutoSync(s.auto_sync ?? true); }); }, []);

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-3xl font-display font-semibold">Paramètres</h1>
      <BentoCard>
        <Label className="mb-2 block">Modèle IA Lovable</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="bg-white/60"><SelectValue /></SelectTrigger>
          <SelectContent>{MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-2">Utilisé pour l'analyse CV, la génération des fiches de poste, le matching et le chat IA.</p>
      </BentoCard>
      <BentoCard>
        <div className="flex items-center justify-between">
          <div><Label>Sync automatique Gmail & Sheets</Label><p className="text-xs text-muted-foreground">Les crons ingèrent les nouveaux CV et postes en continu.</p></div>
          <Switch checked={autoSync} onCheckedChange={setAutoSync} />
        </div>
      </BentoCard>
      <div className="flex gap-2">
        <Button onClick={async () => { setLoading(true); await save({ data: { ai_model: model, auto_sync: autoSync } }); setLoading(false); toast.success("Enregistré"); }} disabled={loading}>Enregistrer</Button>
        <Button variant="outline" onClick={async () => { setLoading(true); const r = await rematch(); setLoading(false); toast.success(`Rematch relancé (${r.jobs} postes).`); }} disabled={loading}>Relancer tous les matches IA</Button>
      </div>
    </div>
  );
}