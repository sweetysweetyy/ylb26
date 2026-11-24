import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { csl as supabase } from "@/coussel/lib/db";
import { useAuth } from "@/coussel/hooks/useAuth";
import { renderSlide } from "@/coussel/lib/carousel.functions";

export const Route = createFileRoute("/_authenticated/coussel/carrousel/$id")({
  head: () => ({
    meta: [
      { title: "Mon carrousel — Croquis" },
      {
        name: "description",
        content:
          "Visualisez les 5 slides dessinées de votre carrousel, leurs textes et les sources qui les appuient.",
      },
      { property: "og:title", content: "Mon carrousel — Croquis" },
      {
        property: "og:description",
        content: "5 slides illustrées en style manuscrit, prêtes à publier.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarouselPage,
});

type Slide = {
  id: string;
  position: number;
  role: string | null;
  headline: string | null;
  body: string | null;
  image_url: string | null;
  status: string;
};
type Carousel = {
  id: string;
  title: string;
  topic: string;
  status: string;
  error: string | null;
  sources: { label?: string; url?: string }[];
};

function CarouselPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const [carousel, setCarousel] = useState<Carousel | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [active, setActive] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const load = useCallback(async () => {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("csl_carousels").select("id, title, topic, status, error, sources").eq("id", id).single(),
      supabase
        .from("csl_slides")
        .select("id, position, role, headline, body, image_url, status")
        .eq("carousel_id", id)
        .order("position"),
    ]);
    if (c) setCarousel(c as Carousel);
    setSlides((s ?? []) as Slide[]);
  }, [id]);

  useEffect(() => {
    if (!session) return;
    load();
    const channel = supabase
      .channel(`carousel-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "csl_slides" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, id, load]);

  // Signature des images stockées
  useEffect(() => {
    const missing = slides.filter((s) => s.image_url && !urls[s.id]);
    if (!missing.length) return;
    (async () => {
      const entries: [string, string][] = [];
      for (const slide of missing) {
        const { data } = await supabase.storage
          .from("coussel-slides")
          .createSignedUrl(slide.image_url as string, 60 * 60 * 24);
        if (data?.signedUrl) entries.push([slide.id, data.signedUrl]);
      }
      if (entries.length) setUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [slides, urls]);

  // Dessin séquentiel des slides restantes
  useEffect(() => {
    if (!session || started.current || slides.length === 0) return;
    if (slides.every((s) => s.image_url)) return;
    started.current = true;
    (async () => {
      for (const slide of slides) {
        if (slide.image_url) continue;
        try {
          await renderSlide({ data: { slideId: slide.id } });
          await load();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Dessin impossible");
          break;
        }
      }
    })();
  }, [session, slides, load]);

  const done = slides.filter((s) => s.image_url).length;

  const downloadAll = async () => {
    for (const slide of slides) {
      const url = urls[slide.id];
      if (!url) continue;
      try {
        const blob = await (await fetch(url)).blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = `slide-${slide.position}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 30_000);
        await new Promise((r) => setTimeout(r, 400));
      } catch {
        toast.error(`Téléchargement impossible pour la slide ${slide.position}`);
      }
    }
  };
  const current = slides[active];

  if (loading || !session) {
    return <main className="grid min-h-screen place-items-center text-sm text-csl-ink-soft">Chargement…</main>;
  }

  return (
    <div className="coussel-theme min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <Link to="/coussel/dashboard" className="csl-font-hand text-3xl leading-none">
            Croquis<span className="text-csl-marker">.</span>
          </Link>
          <Link to="/coussel/dashboard" className="text-sm font-semibold text-csl-ink-soft hover:text-foreground">
            Retour à l'atelier
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-16 pt-8">
        <h1 className="max-w-[22ch] csl-font-hand text-5xl leading-none text-balance">
          {carousel?.title ?? "Carrousel"}
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-csl-ink-soft">
          <span
            className={`size-2.5 rounded-full ${done === 5 ? "bg-csl-moss" : carousel?.status === "error" ? "bg-destructive" : "bg-csl-sunshine"}`}
          />
          {done} / 5 slides dessinées
        </p>
        {carousel?.error && done < 5 && (
          <p className="mt-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{carousel.error}</p>
        )}

        {current && (
          <section className="mt-6">
            <div className="mx-auto max-w-sm">
              <div className="csl-sheet grid aspect-[2/3] place-items-center overflow-hidden">
                {urls[current.id] ? (
                  <img
                    src={urls[current.id]}
                    alt={current.headline ?? `Slide ${current.position}`}
                    className="size-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center">
                    <p className="csl-font-hand text-3xl">Slide {current.position} / 5</p>
                    <p className="mt-2 text-xs uppercase tracking-widest text-csl-ink-soft">
                      {current.status === "error" ? "à relancer" : "dessin en cours…"}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-csl-ink-soft">{current.role}</p>
                <p className="csl-font-hand text-2xl leading-tight">{current.headline}</p>
                <p className="mt-1 text-sm text-csl-ink-soft">{current.body}</p>
              </div>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setActive((i) => Math.max(0, i - 1))}
                  className="grid size-10 place-items-center rounded-full border border-input font-bold transition-colors hover:bg-foreground hover:text-background"
                  aria-label="Slide précédente"
                >
                  ‹
                </button>
                <div className="flex gap-2">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      onClick={() => setActive(index)}
                      aria-label={`Slide ${slide.position}`}
                      className={`size-2.5 rounded-full ${index === active ? "bg-csl-marker" : "bg-foreground/25"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setActive((i) => Math.min(slides.length - 1, i + 1))}
                  className="grid size-10 place-items-center rounded-full border border-input font-bold transition-colors hover:bg-foreground hover:text-background"
                  aria-label="Slide suivante"
                >
                  ›
                </button>
              </div>
              {done > 0 && (
                <button
                  onClick={downloadAll}
                  className="mt-4 block w-full rounded-full border border-input py-2.5 text-center text-sm font-bold"
                >
                  Télécharger toutes les slides ({done})
                </button>
              )}
              {urls[current.id] && (
                <a
                  href={urls[current.id]}
                  download={`slide-${current.position}.png`}
                  className="mt-4 block rounded-full bg-foreground py-2.5 text-center text-sm font-bold text-background"
                >
                  Télécharger cette slide
                </a>
              )}
            </div>
          </section>
        )}

        {carousel?.sources?.length ? (
          <section className="csl-sheet mt-8 p-5">
            <h2 className="csl-font-hand text-2xl leading-none">Sources</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {carousel.sources.map((source, index) => (
                <li key={index}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-csl-marker underline underline-offset-2"
                  >
                    {source.label ?? source.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
