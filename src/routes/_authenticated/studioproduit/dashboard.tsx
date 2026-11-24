import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DrivePanel } from "@/studioproduit/components/DrivePanel";
import { SignedImage } from "@/studioproduit/components/SignedImage";
import { spClient as supabase } from "@/studioproduit/lib/db";
import { analyzeShoot, planShoot, type Analysis, type Settings } from "@/studioproduit/lib/studio.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/studioproduit/dashboard")({
  head: () => ({
    meta: [
      { title: "Nouvelle séance photo — Studio Photo Produit IA" },
      {
        name: "description",
        content:
          "Importez votre produit, laissez l'IA l'analyser et générez 5 photos de mise en scène cohérentes.",
      },
      { property: "og:title", content: "Nouvelle séance photo — Studio Photo Produit IA" },
      {
        property: "og:description",
        content: "Importez un produit et obtenez 5 photos de mise en scène prêtes à publier.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioPage,
});

const OPTIONS = {
  style: ["Éditorial premium", "Minimaliste clean", "Naturel & organique", "Studio contrasté", "Pop coloré", "Luxe sombre"],
  mood: ["Chaleureux", "Frais et lumineux", "Intimiste", "Énergique", "Sérein"],
  background: ["Fond studio uni", "Béton / pierre", "Bois naturel", "Textile froissé", "Marbre", "Décor de vie réel"],
  lighting: ["Lumière naturelle douce", "Contre-jour doré", "Studio softbox", "Ombres graphiques", "Clair-obscur"],
  palette: ["Neutres sable", "Noir & or", "Pastel", "Terracotta", "Vert végétal", "Monochrome produit"],
  usage: ["Fiche produit e-commerce", "Publicité réseaux sociaux", "Page d'accueil de marque", "Catalogue print"],
};

const DEFAULTS: Settings = {
  style: OPTIONS.style[0]!,
  mood: OPTIONS.mood[0]!,
  background: OPTIONS.background[0]!,
  lighting: OPTIONS.lighting[0]!,
  palette: OPTIONS.palette[0]!,
  format: "square",
  usage: OPTIONS.usage[0]!,
  props: "",
  notes: "",
};

type Shoot = {
  id: string;
  product_name: string;
  source_path: string;
  status: string;
  created_at: string;
};

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select className="sp-field focus:sp-field-focus" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function StudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeShoot);
  const plan = useServerFn(planShoot);
  const fileInput = useRef<HTMLInputElement>(null);

  const [shootId, setShootId] = useState<string | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "ready" | "planning">("idle");
  const [history, setHistory] = useState<Shoot[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("sp_shoots")
      .select("id, product_name, source_path, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }: { data: any }) => setHistory((data as Shoot[]) ?? []));
  }, [user]);

  async function onFile(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choisissez une image de votre produit.");
      return;
    }
    setPhase("analyzing");
    setAnalysis(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/${crypto.randomUUID()}/source.${ext}`;
      const up = await supabase.storage.from("studioproduit-photos").upload(path, file, { upsert: true });
      if (up.error) throw new Error(up.error.message);

      const inserted = await supabase
        .from("sp_shoots")
        .insert({ user_id: user.id, source_path: path })
        .select("id")
        .single();
      if (inserted.error) throw new Error(inserted.error.message);

      setSourcePath(path);
      setShootId(inserted.data.id);

      const result = await analyze({ data: { shootId: inserted.data.id } });
      setAnalysis(result);
      setSettings((s) => ({ ...s, style: result.recommended_styles[0] ?? s.style }));
      setPhase("ready");
    } catch (err) {
      setPhase("idle");
      toast.error(err instanceof Error ? err.message : "Analyse impossible");
    }
  }

  async function onGenerate() {
    if (!shootId) return;
    setPhase("planning");
    try {
      await plan({ data: { shootId, settings } });
      navigate({ to: "/studioproduit/$shootId", params: { shootId } });
    } catch (err) {
      setPhase("ready");
      toast.error(err instanceof Error ? err.message : "Construction de la série impossible");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-4xl sm:text-5xl">
        Une photo. <span className="sp-text-gradient">Cinq mises en scène.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Importez votre produit : l'IA l'identifie, cherche les mises en scène qui le valorisent, puis
        construit une série logique de 5 photos prêtes à publier.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* Étape 1 */}
        <section className="sp-card-lift rounded-3xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5">1</span> Votre produit
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />

          {sourcePath ? (
            <SignedImage
              path={sourcePath}
              alt="Produit importé"
              className="aspect-square w-full rounded-2xl object-contain bg-secondary"
            />
          ) : (
            <button
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void onFile(f);
              }}
              className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 text-sm text-muted-foreground hover:bg-secondary"
            >
              <span className="text-3xl">＋</span>
              Glissez la photo de votre produit
              <span className="text-xs">JPG ou PNG, fond simple de préférence</span>
            </button>
          )}

          {sourcePath && (
            <button
              onClick={() => {
                setSourcePath(null);
                setShootId(null);
                setAnalysis(null);
                setPhase("idle");
              }}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Changer de produit
            </button>
          )}

          {phase === "analyzing" && (
            <p className="mt-4 animate-pulse text-sm text-muted-foreground">
              Analyse du produit et recherche des tendances…
            </p>
          )}

          {analysis && (
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <h2 className="text-xl">{analysis.product_name}</h2>
                <p className="text-muted-foreground">
                  {analysis.product_type} · {analysis.materials}
                </p>
              </div>
              <p className="text-muted-foreground">{analysis.positioning}</p>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  Points forts
                </p>
                <ul className="space-y-1">
                  {analysis.key_selling_points.map((p) => (
                    <li key={p} className="text-foreground/90">
                      • {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  Idées tendance
                </p>
                <div className="space-y-2">
                  {analysis.trend_ideas.map((t) => (
                    <div key={t.title} className="rounded-xl bg-secondary/60 p-3">
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Étape 2 */}
        <section className="sp-card-lift h-fit rounded-3xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5">2</span> Personnalisation
          </div>

          <fieldset disabled={!analysis} className="space-y-4 disabled:opacity-40">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Style"
                value={settings.style}
                options={Array.from(new Set([...(analysis?.recommended_styles ?? []), ...OPTIONS.style]))}
                onChange={(v) => setSettings({ ...settings, style: v })}
              />
              <Select
                label="Ambiance"
                value={settings.mood}
                options={OPTIONS.mood}
                onChange={(v) => setSettings({ ...settings, mood: v })}
              />
              <Select
                label="Décor"
                value={settings.background}
                options={OPTIONS.background}
                onChange={(v) => setSettings({ ...settings, background: v })}
              />
              <Select
                label="Lumière"
                value={settings.lighting}
                options={OPTIONS.lighting}
                onChange={(v) => setSettings({ ...settings, lighting: v })}
              />
              <Select
                label="Palette"
                value={settings.palette}
                options={OPTIONS.palette}
                onChange={(v) => setSettings({ ...settings, palette: v })}
              />
              <Select
                label="Destination"
                value={settings.usage}
                options={OPTIONS.usage}
                onChange={(v) => setSettings({ ...settings, usage: v })}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                Format
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["square", "Carré 1:1"],
                    ["portrait", "Portrait 2:3"],
                    ["landscape", "Paysage 3:2"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSettings({ ...settings, format: value })}
                    className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                      settings.format === value
                        ? "border-ring bg-secondary text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                Accessoires souhaités
              </span>
              <input
                className="sp-field focus:sp-field-focus"
                placeholder="Ex : feuillage, café, marbre, mains…"
                value={settings.props}
                onChange={(e) => setSettings({ ...settings, props: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                Consignes de marque
              </span>
              <textarea
                className="sp-field focus:sp-field-focus min-h-20"
                placeholder="Ex : marque écoresponsable, cible 25-35 ans, éviter le plastique visible"
                value={settings.notes}
                onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
              />
            </label>

            <button
              type="button"
              onClick={onGenerate}
              disabled={phase === "planning"}
              className="sp-btn-primary w-full hover:brightness-110 disabled:opacity-60"
            >
              {phase === "planning" ? "Construction de la série…" : "Générer les 5 photos"}
            </button>
          </fieldset>
        </section>
      </div>

      <DrivePanel />

      {history.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-2xl">Vos séances</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {history.map((h) => (
              <Link
                key={h.id}
                to="/studioproduit/$shootId"
                params={{ shootId: h.id }}
                className="group overflow-hidden rounded-2xl border border-border bg-card"
              >
                <SignedImage
                  path={h.source_path}
                  alt={h.product_name}
                  className="aspect-square w-full bg-secondary object-contain transition-transform group-hover:scale-105"
                />
                <div className="p-3">
                  <p className="truncate text-sm">{h.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
