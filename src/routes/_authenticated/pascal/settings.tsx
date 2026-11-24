import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCronConfig, updateCronConfig, runTickNow } from "@/pascal/lib/cron-config.functions";
import { cleanupData } from "@/pascal/lib/reset.functions";
import { getProfile, setWallpaper } from "@/pascal/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Settings, Zap, Trash2, RefreshCw, ImageIcon, Upload, X } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/pascal/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const cron = useQuery({ queryKey: ["cron"], queryFn: () => getCronConfig() });
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (cron.data) setF(cron.data); }, [cron.data]);
  const save = useMutation({
    mutationFn: () => updateCronConfig({ data: { scan_enabled: f.scan_enabled, scan_interval_minutes: f.scan_interval_minutes, replies_enabled: f.replies_enabled, replies_interval_minutes: f.replies_interval_minutes, followups_enabled: f.followups_enabled, followups_interval_minutes: f.followups_interval_minutes, fully_autonomous: f.fully_autonomous } }),
    onSuccess: () => { qc.invalidateQueries(); toast.success("Automatisation mise à jour."); },
  });
  const tick = useMutation({ mutationFn: () => runTickNow(), onSuccess: () => toast.success("Cycle exécuté.") });
  const wipe = useMutation({
    mutationFn: (scope: any) => cleanupData({ data: scope }),
    onSuccess: (r) => { toast.success(`Nettoyage terminé: ${JSON.stringify(r.stats)}`); qc.invalidateQueries(); },
  });
  if (!f) return <div className="text-muted-foreground text-sm">Chargement…</div>;
  const up = (k: string, v: any) => setF({ ...f, [k]: v });

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><Settings className="size-7" /> Paramètres</h1>
          <p className="text-sm text-muted-foreground">Automatisation, cron et nettoyage des données.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="press" onClick={() => tick.mutate()} disabled={tick.isPending}><RefreshCw className={`size-4 mr-2 ${tick.isPending ? "animate-spin" : ""}`} />Exécuter maintenant</Button>
          <Button className="glow-primary press" onClick={() => save.mutate()} disabled={save.isPending}>Enregistrer</Button>
        </div>
      </header>

      <WallpaperCard />

      <div className="bento p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div><h2 className="font-display text-xl flex items-center gap-2"><Zap className="size-5 text-primary" /> Mode 100% autonome</h2><p className="text-sm text-muted-foreground">PASCAL travaille en continu sans intervention.</p></div>
          <Switch checked={f.fully_autonomous} onCheckedChange={(v) => up("fully_autonomous", v)} />
        </div>

        <Row label="Scan Google Sheet (nouveaux prospects)" enabled={f.scan_enabled} onEnabled={(v) => up("scan_enabled", v)} minutes={f.scan_interval_minutes} onMinutes={(v) => up("scan_interval_minutes", v)} />
        <Row label="Lecture des réponses Gmail" enabled={f.replies_enabled} onEnabled={(v) => up("replies_enabled", v)} minutes={f.replies_interval_minutes} onMinutes={(v) => up("replies_interval_minutes", v)} />
        <Row label="Envoi des relances programmées" enabled={f.followups_enabled} onEnabled={(v) => up("followups_enabled", v)} minutes={f.followups_interval_minutes} onMinutes={(v) => up("followups_interval_minutes", v)} min={5} />

        <div className="text-xs text-muted-foreground font-mono">Dernier scan: {f.last_scan_at ?? "—"} · Dernières réponses: {f.last_replies_at ?? "—"} · Dernières relances: {f.last_followups_at ?? "—"}</div>
      </div>

      <div className="bento p-6 space-y-4">
        <h2 className="font-display text-xl flex items-center gap-2"><Trash2 className="size-5 text-destructive" /> Nettoyage & réinitialisation</h2>
        <p className="text-sm text-muted-foreground">Videz sélectivement les données obsolètes ou remettez à zéro votre compte.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button variant="outline" className="press" onClick={() => wipe.mutate({ wipeRuns: true, wipeProspects: false, wipeConversations: false, wipeKpi: false, wipeMemory: false, wipeAutoSkills: false, wipeSkills: false, wipeActionPlans: false, wipeSources: false })}>Vider journal agent</Button>
          <Button variant="outline" className="press" onClick={() => wipe.mutate({ wipeKpi: true, wipeProspects: false, wipeConversations: false, wipeRuns: false, wipeMemory: false, wipeAutoSkills: false, wipeSkills: false, wipeActionPlans: false, wipeSources: false })}>Vider KPI</Button>
          <Button variant="outline" className="press" onClick={() => wipe.mutate({ wipeConversations: true, wipeProspects: false, wipeRuns: false, wipeKpi: false, wipeMemory: false, wipeAutoSkills: false, wipeSkills: false, wipeActionPlans: false, wipeSources: false })}>Vider conversations</Button>
          <Button variant="outline" className="press" onClick={() => wipe.mutate({ wipeProspects: true, wipeConversations: true, wipeRuns: false, wipeKpi: false, wipeMemory: false, wipeAutoSkills: false, wipeSkills: false, wipeActionPlans: false, wipeSources: false })}>Vider prospects</Button>
          <Button variant="outline" className="press" onClick={() => wipe.mutate({ wipeAutoSkills: true, wipeProspects: false, wipeConversations: false, wipeRuns: false, wipeKpi: false, wipeMemory: false, wipeSkills: false, wipeActionPlans: false, wipeSources: false })}>Vider auto-skills</Button>
          <Button variant="outline" className="press" onClick={() => wipe.mutate({ wipeMemory: true, wipeProspects: false, wipeConversations: false, wipeRuns: false, wipeKpi: false, wipeAutoSkills: false, wipeSkills: false, wipeActionPlans: false, wipeSources: false })}>Vider mémoire agent</Button>
        </div>
        <div className="pt-3 border-t border-border/40">
          <Button variant="destructive" className="press" onClick={() => { if (confirm("Réinitialisation totale : toutes vos données PASCAL seront effacées. Confirmer ?")) wipe.mutate({ fullReset: true, wipeProspects: true, wipeConversations: true, wipeRuns: true, wipeKpi: true, wipeMemory: true, wipeAutoSkills: true, wipeSkills: true, wipeActionPlans: true, wipeSources: true }); }}>
            <Trash2 className="size-4 mr-2" /> Réinitialiser complètement le compte
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, enabled, onEnabled, minutes, onMinutes, min = 1 }: { label: string; enabled: boolean; onEnabled: (v: boolean) => void; minutes: number; onMinutes: (v: number) => void; min?: number }) {
  return (
    <div className="surface-1 p-4 flex items-center gap-4">
      <Switch checked={enabled} onCheckedChange={onEnabled} />
      <Label className="flex-1">{label}</Label>
      <div className="flex items-center gap-2">
        <Input type="number" min={min} max={1440} className="w-24" value={minutes} onChange={(e) => onMinutes(parseInt(e.target.value || String(min)))} />
        <span className="text-xs text-muted-foreground">min</span>
      </div>
    </div>
  );
}

function WallpaperCard() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [opacity, setOpacityLocal] = useState<number>(0.35);
  useEffect(() => { if (profile.data?.background_opacity != null) setOpacityLocal(Number(profile.data.background_opacity)); }, [profile.data]);

  const save = useMutation({
    mutationFn: (v: { background_url: string | null; background_opacity?: number }) => setWallpaper({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Fond d'écran mis à jour."); },
  });

  async function onFile(file: File) {
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Non authentifié");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${uid}/wallpaper-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("wallpapers").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("wallpapers").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signed.error) throw signed.error;
      save.mutate({ background_url: signed.data.signedUrl, background_opacity: opacity });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  const bg = profile.data?.background_url as string | null | undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bento bento-glow p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl flex items-center gap-2"><ImageIcon className="size-5 text-primary" /> Fond d'écran personnalisé</h2>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); }} />
          <Button variant="outline" className="press" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="size-4 mr-2" /> {uploading ? "Envoi…" : "Uploader une image"}
          </Button>
          {bg && (
            <Button variant="ghost" className="press" onClick={() => save.mutate({ background_url: null })}>
              <X className="size-4 mr-2" /> Retirer
            </Button>
          )}
        </div>
      </div>
      {bg ? (
        <div className="relative rounded-lg overflow-hidden h-48 border border-border/40">
          <img src={bg} alt="Fond d'écran" className="w-full h-full object-cover" style={{ opacity }} />
        </div>
      ) : (
        <div className="rounded-lg h-40 border border-dashed border-border/60 grid place-items-center text-sm text-muted-foreground">
          Aucun fond d'écran actif — utilisez le bouton pour en uploader un.
        </div>
      )}
      <div className="space-y-2">
        <div className="flex justify-between"><Label>Opacité du fond</Label><span className="font-mono text-xs">{Math.round(opacity * 100)}%</span></div>
        <Slider value={[opacity * 100]} min={5} max={100} step={5} onValueChange={(v) => setOpacityLocal(v[0] / 100)} onValueCommit={(v) => save.mutate({ background_url: bg ?? null, background_opacity: v[0] / 100 })} />
      </div>
    </motion.div>
  );
}