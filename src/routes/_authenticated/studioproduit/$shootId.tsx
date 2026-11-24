import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SignedImage } from "@/studioproduit/components/SignedImage";
import { spClient as supabase } from "@/studioproduit/lib/db";
import { renderShot, type Analysis } from "@/studioproduit/lib/studio.functions";

export const Route = createFileRoute("/_authenticated/studioproduit/$shootId")({
  head: () => ({
    meta: [
      { title: "Votre série de 5 photos — Studio Photo Produit IA" },
      {
        name: "description",
        content:
          "Suivez la génération de vos 5 photos de mise en scène, relancez une image et téléchargez-les.",
      },
      { property: "og:title", content: "Votre série de 5 photos — Studio Photo Produit IA" },
      {
        property: "og:description",
        content: "5 photos produit générées, cohérentes et prêtes à publier.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShootPage,
});

type Shot = {
  id: string;
  position: number;
  title: string;
  intent: string;
  image_path: string | null;
  status: string;
  error: string | null;
};

type Shoot = {
  id: string;
  product_name: string;
  source_path: string;
  status: string;
  analysis: Analysis | null;
};

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "done"
      ? "Prête"
      : status === "rendering"
        ? "Génération…"
        : status === "failed"
          ? "Échec"
          : "En attente";
  return (
    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

function ShootPage() {
  const { shootId } = Route.useParams();
  const render = useServerFn(renderShot);
  const [shoot, setShoot] = useState<Shoot | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const running = useRef(false);

  const loadShots = useCallback(async () => {
    const { data } = await supabase
      .from("sp_shots")
      .select("id, position, title, intent, image_path, status, error")
      .eq("shoot_id", shootId)
      .order("position");
    setShots((data as Shot[]) ?? []);
    return (data as Shot[]) ?? [];
  }, [shootId]);

  useEffect(() => {
    supabase
      .from("sp_shoots")
      .select("id, product_name, source_path, status, analysis")
      .eq("id", shootId)
      .single()
      .then(({ data }: { data: any }) => setShoot(data as unknown as Shoot));
    void loadShots();

    const channel = supabase
      .channel(`shots-${shootId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sp_shots", filter: `shoot_id=eq.${shootId}` },
        () => void loadShots(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [shootId, loadShots]);

  // Génère les photos en attente, une par une, pour rester léger et lisible.
  useEffect(() => {
    if (running.current) return;
    const pending = shots.filter((s) => s.status === "pending");
    if (pending.length === 0) return;
    running.current = true;
    (async () => {
      for (const shot of pending) {
        try {
          await render({ data: { shotId: shot.id } });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Une photo n'a pas pu être générée.");
        }
        await loadShots();
      }
      running.current = false;
    })();
  }, [shots, render, loadShots]);

  async function retry(shot: Shot) {
    setShots((prev) =>
      prev.map((s) => (s.id === shot.id ? { ...s, status: "rendering", error: null } : s)),
    );
    try {
      await render({ data: { shotId: shot.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nouvelle tentative impossible");
    }
    await loadShots();
  }

  async function download(shot: Shot) {
    if (!shot.image_path) return;
    const { data } = await supabase.storage.from("studioproduit-photos").createSignedUrl(shot.image_path, 60);
    if (!data?.signedUrl) return;
    const blob = await (await fetch(data.signedUrl)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(shoot?.product_name ?? "photo").replace(/\s+/g, "-").toLowerCase()}-${shot.position}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const done = shots.filter((s) => s.status === "done").length;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link to="/studioproduit/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
        ← Nouvelle séance
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{shoot?.product_name ?? "Séance photo"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {done} photo{done > 1 ? "s" : ""} sur {shots.length || 5} prête
            {done > 1 ? "s" : ""}.
          </p>
        </div>
        {shoot?.source_path && (
          <SignedImage
            path={shoot.source_path}
            alt="Produit de référence"
            className="h-20 w-20 rounded-xl bg-secondary object-contain"
          />
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shots.map((shot) => (
          <article
            key={shot.id}
            className="sp-card-lift overflow-hidden rounded-3xl border border-border bg-card"
          >
            {shot.image_path ? (
              <SignedImage
                path={shot.image_path}
                alt={shot.title}
                className="aspect-square w-full bg-secondary object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-secondary/50 text-xs text-muted-foreground">
                {shot.status === "failed" ? (
                  <span className="px-6 text-center">{shot.error ?? "Génération échouée"}</span>
                ) : (
                  <span className="animate-pulse">Composition de la photo {shot.position}…</span>
                )}
              </div>
            )}
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {shot.position}. {shot.title}
                </p>
                <StatusBadge status={shot.status} />
              </div>
              <p className="text-xs text-muted-foreground">{shot.intent}</p>
              <div className="flex gap-2 pt-1">
                {shot.status === "done" && (
                  <button
                    onClick={() => void download(shot)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                  >
                    Télécharger
                  </button>
                )}
                {shot.status !== "rendering" && (
                  <button
                    onClick={() => void retry(shot)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                  >
                    {shot.status === "done" ? "Regénérer" : "Relancer"}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
