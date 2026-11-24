import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateCarousel } from "@/cml/lib/ai.functions";
import { toast } from "sonner";
import { Layers, Loader2, Download, Sparkles } from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/cml/carousels")({
  component: CarouselsPage,
  head: () => ({
    meta: [
      { title: "Générateur de carrousels LinkedIn | Holo CM" },
      { name: "description", content: "Génère des carrousels LinkedIn haut de gamme avec l'IA et exporte-les en PDF prêt à publier." },
      { property: "og:title", content: "Générateur de carrousels LinkedIn" },
      { property: "og:description", content: "Slides IA, export PDF instantané." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function CarouselsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState(8);
  const [busy, setBusy] = useState(false);
  const gen = useServerFn(generateCarousel);

  async function load() {
    const { data } = await supabase.from("cml_carousels").select("*").order("created_at", { ascending: false }).limit(30);
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (topic.trim().length < 3) { toast.error("Sujet trop court"); return; }
    setBusy(true);
    try { await gen({ data: { topic, slides } }); toast.success("Carrousel généré ✨"); setTopic(""); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  function exportPdf(c: any) {
    const doc = new jsPDF({ orientation: "portrait", unit: "px", format: [1080, 1350] });
    (c.slides ?? []).forEach((s: any, i: number) => {
      if (i > 0) doc.addPage([1080, 1350], "portrait");
      doc.setFillColor(26, 49, 44); doc.rect(0, 0, 1080, 1350, "F");
      doc.setTextColor(93, 248, 216); doc.setFontSize(28);
      doc.text(String(s.kicker ?? `${i + 1}/${c.slides.length}`), 80, 140);
      doc.setTextColor(255, 255, 255); doc.setFontSize(76);
      doc.text(doc.splitTextToSize(String(s.headline ?? ""), 900), 80, 320);
      doc.setFontSize(40); doc.setTextColor(220, 235, 230);
      doc.text(doc.splitTextToSize(String(s.body ?? ""), 900), 80, 700);
    });
    doc.save(`${(c.title ?? "carrousel").slice(0, 40)}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Formats</div>
        <h1 className="mt-1 font-display text-4xl font-semibold">Générateur de <span className="cml-text-holo">carrousels</span></h1>
      </div>

      <div className="cml-bento p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Sujet du carrousel…"
            className="min-w-[240px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
          <input type="number" min={4} max={12} value={slides} onChange={(e) => setSlides(Number(e.target.value))}
            className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
          <button onClick={create} disabled={busy}
            className="inline-flex items-center gap-2 rounded-full cml-bg-holo px-5 py-2.5 text-sm font-semibold text-primary-foreground cml-ring-holo">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Générer
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="cml-bento p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{c.title}</h3>
              <button onClick={() => exportPdf(c)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {(c.slides ?? []).map((s: any, i: number) => (
                <div key={i} className="min-w-[180px] rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] cml-text-holo">{s.kicker ?? `${i + 1}`}</div>
                  <div className="mt-1 line-clamp-3 text-sm font-semibold">{s.headline}</div>
                  <div className="mt-1 line-clamp-4 text-[11px] text-muted-foreground">{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="cml-bento col-span-full p-10 text-center text-muted-foreground">
            <Layers className="mx-auto h-6 w-6" /><p className="mt-2 text-sm">Aucun carrousel pour l'instant.</p>
          </div>
        )}
      </div>
    </div>
  );
}
