import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { connectLinkedIn } from "@/cml/lib/linkedin.functions";
import { toast } from "sonner";
import { Linkedin, Save, Bot, Wand2, Image as ImageIcon, Bell, Zap, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cml/settings")({
  component: SettingsPage,
});

const CHAT_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3.5-flash",
  "google/gemini-3.6-flash",
  "google/gemini-3.1-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.5",
  "openai/gpt-5.6-sol",
];
const IMAGE_MODELS = [
  "openai/gpt-image-2.5-sunburst",
  "openai/gpt-image-2",
  "openai/gpt-image-1-mini",
  "google/gemini-3-pro-image",
  "google/gemini-3.1-flash-image",
  "google/gemini-2.5-flash-image",
];

function SettingsPage() {
  const [s, setS] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const cli = useServerFn(connectLinkedIn);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? "");
      const [{ data: st }, { data: p }] = await Promise.all([
        supabase.from("cml_settings").select("*").eq("user_id", u.user!.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle(),
      ]);
      setS(st ?? {}); setProfile(p ?? {});
    })();
  }, []);

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("cml_settings").update({
      chat_model: s.chat_model, ideas_model: s.ideas_model,
      writing_model: s.writing_model, image_model: s.image_model,
      notify_email: s.notify_email, notify_inapp: s.notify_inapp,
      auto_publish: s.auto_publish,
    }).eq("user_id", u.user!.id);
    if (profile) await supabase.from("profiles").update({ display_name: profile.display_name }).eq("id", u.user!.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Paramètres enregistrés");
  }

  async function connect() {
    setBusy(true);
    try {
      const r = await cli({});
      setS({ ...s, linkedin_connected: true, linkedin_profile: r.profile });
      toast.success(`LinkedIn connecté via Kemey — ${r.profile?.name ?? "OK"}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("cml_settings").update({ linkedin_connected: false, linkedin_profile: null }).eq("user_id", u.user!.id);
    setS({ ...s, linkedin_connected: false, linkedin_profile: null });
    toast.success("Déconnecté");
  }

  if (!s) return <div className="text-muted-foreground">Chargement…</div>;

  const lp = s.linkedin_profile as any;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Paramètres</div>
        <h1 className="mt-1 font-display text-4xl font-semibold">Contrôle <span className="cml-text-holo">total</span></h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="cml-bento p-5">
          <h2 className="font-display text-lg font-semibold">Profil</h2>
          <label className="mt-3 block text-xs text-muted-foreground">Nom affiché</label>
          <input value={profile?.display_name ?? ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none" />
          <label className="mt-3 block text-xs text-muted-foreground">Email</label>
          <input value={email} disabled className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none opacity-70" />
        </div>

        <div className="cml-bento cml-holo-halo p-5">
          <div className="flex items-center gap-2">
            <Linkedin className="h-4 w-4" style={{ color: "#5DF8D8" }} />
            <h2 className="font-display text-lg font-semibold">LinkedIn (Kemey)</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            OAuth via le connecteur Kemey. Scopes: OpenID · Profile · Email · Publier des posts.
          </p>

          {s.linkedin_connected && lp ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              {lp.picture && <img src={lp.picture} alt="" className="h-10 w-10 rounded-full" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {lp.name} <CheckCircle2 className="h-3.5 w-3.5 cml-text-holo" />
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{lp.email}</div>
              </div>
              <button onClick={disconnect} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">Déconnecter</button>
            </div>
          ) : (
            <button onClick={connect} disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-full cml-bg-holo px-4 py-2 text-sm font-semibold text-primary-foreground cml-ring-holo disabled:opacity-60">
              <Linkedin className="h-4 w-4" /> {busy ? "Connexion…" : "Connecter LinkedIn"}
            </button>
          )}

          <div className="mt-4 flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 cml-text-holo" /> Auto-publication planifiée</div>
            <input type="checkbox" checked={!!s.auto_publish} onChange={(e) => setS({ ...s, auto_publish: e.target.checked })} className="h-4 w-4 accent-[#5DF8D8]" />
          </div>
        </div>
      </div>

      <div className="cml-bento p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" style={{ color: "#5DF8D8" }} />
          <h2 className="font-display text-lg font-semibold">Notifications</h2>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
            <span className="text-sm">Notifications in-app</span>
            <input type="checkbox" checked={!!s.notify_inapp} onChange={(e) => setS({ ...s, notify_inapp: e.target.checked })} className="h-4 w-4 accent-[#5DF8D8]" />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
            <span className="text-sm">Notifications email</span>
            <input type="checkbox" checked={!!s.notify_email} onChange={(e) => setS({ ...s, notify_email: e.target.checked })} className="h-4 w-4 accent-[#5DF8D8]" />
          </label>
        </div>
      </div>

      <div className="cml-bento p-5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" style={{ color: "#5DF8D8" }} />
          <h2 className="font-display text-lg font-semibold">Modèles Lovable AI</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Choisis le moteur IA pour chaque tâche.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ModelPick icon={<Wand2 className="h-4 w-4" />} label="Idées tendances" value={s.ideas_model}
            onChange={(v) => setS({ ...s, ideas_model: v })} options={CHAT_MODELS} />
          <ModelPick icon={<Bot className="h-4 w-4" />} label="Rédaction posts" value={s.writing_model}
            onChange={(v) => setS({ ...s, writing_model: v })} options={CHAT_MODELS} />
          <ModelPick icon={<Bot className="h-4 w-4" />} label="Assistant général" value={s.chat_model}
            onChange={(v) => setS({ ...s, chat_model: v })} options={CHAT_MODELS} />
          <ModelPick icon={<ImageIcon className="h-4 w-4" />} label="Génération image" value={s.image_model}
            onChange={(v) => setS({ ...s, image_model: v })} options={IMAGE_MODELS} />
        </div>
      </div>

      <button onClick={save}
        className="inline-flex items-center gap-2 rounded-full cml-bg-holo px-6 py-3 text-sm font-semibold text-primary-foreground cml-ring-holo">
        <Save className="h-4 w-4" /> Enregistrer
      </button>
    </div>
  );
}

function ModelPick({ icon, label, value, onChange, options }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</label>
      <select value={value ?? options[0]} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
        {options.map((o) => <option key={o} value={o} className="bg-[#1A312C]">{o}</option>)}
      </select>
    </div>
  );
}
