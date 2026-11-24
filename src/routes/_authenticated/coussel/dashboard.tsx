import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { csl as supabase } from "@/coussel/lib/db";
import { useAuth } from "@/coussel/hooks/useAuth";
import { defaultSettings, planCarousel, searchIdeas, type Settings } from "@/coussel/lib/carousel.functions";

export const Route = createFileRoute("/_authenticated/coussel/dashboard")({
  head: () => ({
    meta: [
      { title: "Croquis — carrousels illustrés à la main pour les réseaux" },
      {
        name: "description",
        content:
          "Écrivez une idée ou explorez les tendances : Croquis construit un carrousel de 5 slides sourcées et dessinées en style manuscrit.",
      },
      { property: "og:title", content: "Croquis — carrousels illustrés à la main" },
      {
        property: "og:description",
        content: "5 slides dessinées, une logique narrative claire et des sources fiables.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Atelier,
});

type Idea = { title: string; angle: string };
type CarouselRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

const options = {
  tone: ["Ludique et chaleureux", "Pédagogique et posé", "Piquant et direct", "Poétique"],
  stroke: ["Feutre griffonné", "Encre fine", "Crayon doux", "Peinture à l'eau"],
  palette: ["Terre & crème", "Végétal & encre", "Sérigraphie vive", "Pastel doux"],
  audience: ["Grand public curieux", "Étudiants", "Entrepreneurs", "Parents", "Professionnels du secteur"],
  language: ["Français", "Anglais", "Espagnol"],
};

function Atelier() {
  const navigate = useNavigate();
  const { session, user, loading } = useAuth();

  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [idea, setIdea] = useState("");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [searching, setSearching] = useState(false);
  const [building, setBuilding] = useState(false);
  const [carousels, setCarousels] = useState<CarouselRow[]>([]);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("csl_carousels")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      if (active) setCarousels((data ?? []) as CarouselRow[]);
    };
    load();

    const channel = supabase
      .channel("carousels-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "csl_carousels" }, load)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function onSearch() {
    if (topic.trim().length < 3) {
      toast.error("Décrivez d'abord un sujet.");
      return;
    }
    setSearching(true);
    try {
      const result = await searchIdeas({ data: { topic: topic.trim() } });
      setIdeas(result.ideas);
      if (!result.ideas.length) toast.error("Aucune idée trouvée, reformulez le sujet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recherche impossible");
    } finally {
      setSearching(false);
    }
  }

  async function onBuild() {
    const chosen = idea.trim() || topic.trim();
    if (chosen.length < 3) {
      toast.error("Choisissez ou écrivez une idée.");
      return;
    }
    setBuilding(true);
    try {
      const { carouselId } = await planCarousel({
        data: { topic: topic.trim() || chosen, idea: chosen, settings },
      });
      navigate({ to: "/coussel/carrousel/$id", params: { id: carouselId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Construction impossible");
      setBuilding(false);
    }
  }

  if (loading || !session) {
    return <main className="grid min-h-screen place-items-center text-sm text-csl-ink-soft">Chargement…</main>;
  }

  return (
    <div className="coussel-theme min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <span className="csl-font-hand text-3xl leading-none">
            Croquis<span className="text-csl-marker">.</span>
          </span>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-csl-ink-soft sm:inline">{user?.email}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="font-semibold text-csl-ink-soft hover:text-foreground"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        <section className="pt-8">
          <p className="csl-font-hand text-2xl text-csl-marker">Atelier de création</p>
          <h1 className="max-w-[18ch] csl-font-hand text-5xl leading-none text-balance">
            Ton carrousel, tracé de A à Z
          </h1>
          <p className="mt-2 max-w-[60ch] text-sm text-csl-ink-soft">
            Trois étapes : l'idée, la personnalisation, la génération. La logique et les sources sont
            construites par l'IA de raisonnement, les dessins par l'IA d'image.
          </p>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <section className="csl-sheet p-5 sm:p-6">
              <h2 className="csl-font-hand text-3xl leading-none">Étape 1 — L'idée</h2>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-csl-ink-soft">
                Votre sujet ou votre note d'intention
              </label>
              <textarea
                rows={2}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Pourquoi les plantes d'intérieur aident à mieux dormir, sans jargon."
                className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background/60 p-3 text-sm outline-none focus:border-csl-marker"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={onSearch}
                  disabled={searching}
                  className="rounded-full border border-input px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  {searching ? "Recherche en cours…" : "Chercher des idées tendance"}
                </button>
                {idea && (
                  <span className="rounded-full bg-csl-moss/15 px-3 py-2 text-xs font-bold text-csl-moss">
                    Idée choisie
                  </span>
                )}
              </div>

              {ideas.length > 0 && (
                <div className="mt-4 space-y-2">
                  {ideas.map((item) => {
                    const selected = idea === item.title;
                    return (
                      <button
                        key={item.title}
                        onClick={() => setIdea(item.title)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left transition-colors ${selected ? "border-2 border-csl-marker bg-csl-marker/5" : "border border-border hover:bg-secondary/60"}`}
                      >
                        <span>
                          <span className="block text-sm font-bold">{item.title}</span>
                          <span className="block text-xs text-csl-ink-soft">{item.angle}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold">
                          {selected ? "Choisie" : "Choisir"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-csl-ink-soft">
                Ou écrivez votre idée
              </label>
              <input
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="5 plantes qui aident vraiment à s'endormir"
                className="mt-1.5 w-full rounded-lg border border-input bg-background/60 p-2.5 text-sm outline-none focus:border-csl-marker"
              />
            </section>

            <section className="csl-sheet p-5 sm:p-6">
              <h2 className="csl-font-hand text-3xl leading-none">Étape 2 — Personnalisation</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(Object.keys(options) as (keyof typeof options)[]).map((key) => (
                  <label key={key} className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-csl-ink-soft">
                      {
                        {
                          tone: "Ton",
                          stroke: "Style de trait",
                          palette: "Palette",
                          audience: "Public",
                          language: "Langue",
                        }[key]
                      }
                    </span>
                    <select
                      value={settings[key]}
                      onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-input bg-background/60 p-2.5 text-sm outline-none focus:border-csl-marker"
                    >
                      {options[key].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>

            <section className="csl-sheet p-5 sm:p-6">
              <h2 className="csl-font-hand text-3xl leading-none">Étape 3 — Génération</h2>
              <p className="mt-2 text-sm text-csl-ink-soft">
                5 slides : accroche, contexte, explication, preuve, conclusion. Sources citées en fin de
                carrousel.
              </p>
              <button
                onClick={onBuild}
                disabled={building}
                className="mt-4 w-full rounded-full bg-csl-marker py-3 text-sm font-bold text-background disabled:opacity-60 sm:w-auto sm:px-8"
              >
                {building ? "Construction de la logique…" : "Construire mon carrousel"}
              </button>
            </section>
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="csl-sheet p-5">
              <h3 className="csl-font-hand text-2xl leading-none">Mes carrousels</h3>
              {carousels.length === 0 ? (
                <p className="mt-3 text-xs text-csl-ink-soft">Aucun carrousel pour l'instant.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {carousels.map((item) => (
                    <li key={item.id}>
                      <Link
                        to="/coussel/carrousel/$id"
                        params={{ id: item.id }}
                        className="block rounded-lg p-2 transition-colors hover:bg-secondary/60"
                      >
                        <span className="block truncate text-sm font-bold">{item.title}</span>
                        <span className="block text-xs text-csl-ink-soft">
                          {new Date(item.created_at).toLocaleDateString("fr-FR")} ·{" "}
                          {item.status === "done"
                            ? "terminé"
                            : item.status === "error"
                              ? "à relancer"
                              : "en cours"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
