import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BentoCard } from "@/feeloo/components/bento-card";
import { Button } from "@/feeloo/components/ui/button";
import { Input } from "@/feeloo/components/ui/input";
import { Label } from "@/feeloo/components/ui/label";
import { Mail, Sheet, CheckCircle2, XCircle } from "lucide-react";
import { buildGoogleOAuthUrlFn, disconnectGoogleFn, getIntegrationStatusFn, saveSettingsFn } from "@/feeloo/lib/integrations.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feeloo/integrations")({
  head: () => ({ meta: [{ title: "Intégrations — TalentCortex" }] }),
  component: Integrations,
});

function Integrations() {
  const [status, setStatus] = useState<any>({ google: null, settings: null });
  const [ssid, setSsid] = useState("");
  const [range, setRange] = useState("A:Z");
  const [query, setQuery] = useState("cv OR curriculum has:attachment newer_than:30d");

  const build = useServerFn(buildGoogleOAuthUrlFn);
  const disc = useServerFn(disconnectGoogleFn);
  const stat = useServerFn(getIntegrationStatusFn);
  const save = useServerFn(saveSettingsFn);

  const load = async () => {
    const s = await stat();
    setStatus(s);
    setSsid(s?.settings?.sheets_spreadsheet_id ?? "");
    setRange(s?.settings?.sheets_range ?? "A:Z");
    setQuery(s?.settings?.gmail_search_query ?? "cv OR curriculum has:attachment newer_than:30d");
  };
  useEffect(() => { load(); }, []);

  const connect = async () => {
    const { url } = await build({ data: { origin: window.location.origin } });
    window.location.href = url;
  };
  const disconnect = async () => { await disc(); toast.success("Google déconnecté"); load(); };
  const saveSheet = async () => { await save({ data: { sheets_spreadsheet_id: ssid || null, sheets_range: range, gmail_search_query: query } }); toast.success("Enregistré"); };

  const connected = !!status.google;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display font-semibold">Intégrations <span className="holo-text">Google</span></h1>
      <p className="text-sm text-muted-foreground">La connexion Google est partagée avec tout le Laboratoire (Paramètres → Google).</p>

      <BentoCard glow>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl holo-bg grid place-items-center text-white"><Mail className="size-5" /></div>
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">Google (Gmail + Sheets) {connected ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-muted-foreground" />}</div>
            <div className="text-xs text-muted-foreground">{connected ? `Connecté : ${status.google?.email}` : "Non connecté"}</div>
          </div>
          {connected ? <Button variant="outline" onClick={disconnect}>Déconnecter</Button> : <Button onClick={connect}>Connecter Google dans le Laboratoire</Button>}
        </div>
      </BentoCard>

      <BentoCard>
        <h3 className="font-display text-lg mb-3 flex items-center gap-2"><Mail className="size-4" /> Cron Gmail — recherche des CV</h3>
        <Label>Requête Gmail</Label>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} className="bg-white/60 mt-1" />
        <p className="text-xs text-muted-foreground mt-1">Les mails matchant + avec pièce jointe sont extraits et analysés par IA.</p>
      </BentoCard>

      <BentoCard>
        <h3 className="font-display text-lg mb-3 flex items-center gap-2"><Sheet className="size-4" /> Cron Google Sheets — postes</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>ID du Google Sheet</Label><Input value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="1AbCdEfGh…" className="bg-white/60 mt-1" /></div>
          <div><Label>Plage</Label><Input value={range} onChange={(e) => setRange(e.target.value)} placeholder="A:Z" className="bg-white/60 mt-1" /></div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Chaque nouvelle ligne = nouveau poste analysé et matché automatiquement.</p>
        <div className="mt-3"><Button onClick={saveSheet}>Enregistrer</Button></div>
      </BentoCard>
    </div>
  );
}