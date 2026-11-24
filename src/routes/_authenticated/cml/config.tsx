import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Save, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cml/config")({
  component: ConfigPage,
});

const TONES = ["Expert", "Inspirant", "Provocateur", "Pédagogue", "Storytelling", "Direct", "Analytique"];
const FREQ = ["1/semaine", "3/semaine", "5/semaine", "Quotidien"];
const STRUCTURES = [
  { id: "hook_story_cta", label: "Hook → Story → CTA", desc: "Storytelling narratif classique." },
  { id: "problem_solution_cta", label: "Problème → Solution → CTA", desc: "Direct, orienté conversion." },
  { id: "framework_steps", label: "Framework en étapes", desc: "Liste structurée, valeur pédagogique." },
  { id: "contrarian_proof", label: "Contrarian → Preuve → Insight", desc: "Positionnement fort, débat." },
  { id: "data_insight_action", label: "Data → Insight → Action", desc: "Chiffres et retour sur expérience." },
  { id: "custom", label: "Personnalisé", desc: "Décris ta structure préférée." },
];

function ConfigPage() {
  const [s, setS] = useState<any>({
    industry: "", niche: "", target_audience: "", tone: "Expert",
    language: "fr", goals: "", keywords: [], brand_voice: "",
    personal_bio: "", content_pillars: [], posting_frequency: "3/semaine",
  });
  const [loading, setLoading] = useState(true);

  const [structure, setStructure] = useState<string>("hook_story_cta");
  const [customStructure, setCustomStructure] = useState<string>("");
  const [emojis, setEmojis] = useState<string>("moderate");
  const [maxLine, setMaxLine] = useState<number>(12);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("cml_settings").select("*").eq("user_id", u.user!.id).maybeSingle();
      if (data) {
        setS({ ...s, ...data, keywords: data.keywords ?? [], content_pillars: data.content_pillars ?? [] });
        const p: any = data.post_structure_pref ?? {};
        setStructure(p.structure ?? "hook_story_cta");
        setCustomStructure(p.custom ?? "");
        setEmojis(p.emojis ?? "moderate");
        setMaxLine(p.max_line ?? 12);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("cml_settings").update({
      industry: s.industry, niche: s.niche, target_audience: s.target_audience,
      tone: s.tone, language: s.language, goals: s.goals,
      keywords: s.keywords, brand_voice: s.brand_voice, personal_bio: s.personal_bio,
      content_pillars: s.content_pillars, posting_frequency: s.posting_frequency,
      post_structure_pref: { structure, custom: customStructure, emojis, max_line: maxLine },
      onboarded: true,
    }).eq("user_id", u.user!.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Configuration enregistrée — l'interface s'adapte ✨");
  }

  if (loading) return <div className="text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Configuration</div>
        <h1 className="mt-1 font-display text-4xl font-semibold">Ton <span className="cml-text-holo">ADN</span> LinkedIn</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Ces informations configurent tout le cockpit : idées, rédaction, images. Plus c'est précis, plus l'IA est chirurgicale.
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Secteur / Industrie" value={s.industry} onChange={(v) => setS({ ...s, industry: v })} placeholder="SaaS B2B, Fintech, Coaching…" />
        <Field label="Niche précise" value={s.niche} onChange={(v) => setS({ ...s, niche: v })} placeholder="Vente sortante pour éditeurs SaaS" />
        <Field label="Audience cible" value={s.target_audience} onChange={(v) => setS({ ...s, target_audience: v })} placeholder="CEO / Head of Sales SaaS 10-200 pers" />
        <SelectField label="Tonalité" value={s.tone} onChange={(v) => setS({ ...s, tone: v })} options={TONES} />
        <SelectField label="Fréquence de publication" value={s.posting_frequency} onChange={(v) => setS({ ...s, posting_frequency: v })} options={FREQ} />
        <SelectField label="Langue" value={s.language} onChange={(v) => setS({ ...s, language: v })} options={["fr", "en", "es", "de", "it"]} />
      </div>

      <Textarea label="Objectifs" value={s.goals} onChange={(v) => setS({ ...s, goals: v })} placeholder="Générer des leads, construire ma marque, recruter…" />
      <Textarea label="Voix de marque / style" value={s.brand_voice} onChange={(v) => setS({ ...s, brand_voice: v })} placeholder="Direct, chiffré, honnête, un peu contrarien…" />
      <Textarea label="Bio / positionnement personnel" value={s.personal_bio} onChange={(v) => setS({ ...s, personal_bio: v })} placeholder="Qui tu es, ce que tu vends, tes preuves…" />
      <ChipsField label="Mots-clés (Enter pour ajouter)" values={s.keywords} onChange={(v) => setS({ ...s, keywords: v })} />
      <ChipsField label="Piliers de contenu" values={s.content_pillars} onChange={(v) => setS({ ...s, content_pillars: v })} />

      <div className="cml-bento p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Structure de rédaction</div>
        <h3 className="mt-1 font-display text-lg font-semibold">Comment tes posts doivent être <span className="cml-text-holo">structurés</span></h3>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {STRUCTURES.map((st) => (
            <button key={st.id} onClick={() => setStructure(st.id)}
              className={`text-left rounded-xl border p-3 transition ${structure === st.id ? "border-holo/60 cml-bg-holo/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
              <div className="text-sm font-medium">{st.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{st.desc}</div>
            </button>
          ))}
        </div>
        {structure === "custom" && (
          <textarea value={customStructure} onChange={(e) => setCustomStructure(e.target.value)} rows={3}
            placeholder="Ex: Anecdote perso → 3 leçons chiffrées → Question ouverte"
            className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none" />
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Emojis</label>
            <select value={emojis} onChange={(e) => setEmojis(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none">
              <option className="bg-[#1A312C]" value="none">Aucun</option>
              <option className="bg-[#1A312C]" value="moderate">Modéré (2-3)</option>
              <option className="bg-[#1A312C]" value="rich">Riche</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Longueur max de ligne (mots)</label>
            <input type="number" min={6} max={20} value={maxLine} onChange={(e) => setMaxLine(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none" />
          </div>
        </div>
      </div>

      <button
        onClick={save}
        className="inline-flex items-center gap-2 rounded-full cml-bg-holo px-6 py-3 text-sm font-semibold text-primary-foreground cml-ring-holo hover:scale-[1.01]"
      >
        <Save className="h-4 w-4" /> Enregistrer la configuration
      </button>
    </div>
  );
}

type F = { label: string; value: string; onChange: (v: string) => void; placeholder?: string };
function Field({ label, value, onChange, placeholder }: F) {
  return (
    <div className="cml-bento p-4">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 outline-none focus:border-white/20" />
    </div>
  );
}
function Textarea({ label, value, onChange, placeholder }: F) {
  return (
    <div className="cml-bento p-4">
      <label className="text-xs text-muted-foreground">{label}</label>
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="mt-1 w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 outline-none focus:border-white/20" />
    </div>
  );
}
function SelectField({ label, value, onChange, options }: F & { options: string[] }) {
  return (
    <div className="cml-bento p-4">
      <label className="text-xs text-muted-foreground">{label}</label>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 outline-none">
        {options.map((o) => <option key={o} value={o} className="bg-[#1A312C]">{o}</option>)}
      </select>
    </div>
  );
}
function ChipsField({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  return (
    <div className="cml-bento p-4">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {(values ?? []).map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs">
            {v}
            <button className="text-muted-foreground" onClick={() => onChange(values.filter((_, j) => j !== i))}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              e.preventDefault();
              onChange([...(values ?? []), input.trim()]);
              setInput("");
            }
          }}
          className="min-w-[120px] flex-1 rounded-lg border border-white/5 bg-white/5 px-3 py-1 text-sm outline-none"
          placeholder="Ajouter…"
        />
      </div>
    </div>
  );
}
