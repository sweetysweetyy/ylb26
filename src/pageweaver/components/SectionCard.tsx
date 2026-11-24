import { useRef, useState } from "react";
import { GripVertical, Loader2, MapPin, PenLine, MousePointer2, Check } from "lucide-react";
import type { Design } from "@/pageweaver/lib/ai.functions";
import { Frame } from "./Frame";
import { CARD_W, SCALE, uid, type Annotations, type Section } from "./types";
import { startDrag } from "./Board";
import { cn } from "@/lib/utils";

export type Tool = "none" | "pin" | "pen";

export function SectionCard({
  section, design, selected, k, tool, onSelect, onMove, onMoveEnd, onAnnotations, frameRef, onTool,
}: {
  section: Section;
  design: Design;
  selected: boolean;
  k: number;
  tool: Tool;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
  onMoveEnd: () => void;
  onAnnotations: (a: Annotations) => void;
  frameRef?: (el: HTMLIFrameElement | null) => void;
  onTool: (t: Tool) => void;
}) {
  const overlay = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<[number, number][] | null>(null);
  const ann = section.annotations ?? { markers: [], strokes: [] };
  const active = selected && tool !== "none" && !!section.html;
  const generating = section.status === "generating";

  function rel(e: React.PointerEvent): [number, number] {
    const r = overlay.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  }
  function down(e: React.PointerEvent) {
    e.stopPropagation();
    if (tool === "pin") {
      const [x, y] = rel(e);
      onAnnotations({ ...ann, markers: [...ann.markers, { id: uid(), x, y, note: "" }] });
    } else if (tool === "pen") {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDraft([rel(e)]);
    }
  }
  function move(e: React.PointerEvent) {
    if (draft) setDraft([...draft, rel(e)]);
  }
  function up() {
    if (draft && draft.length > 2) onAnnotations({ ...ann, strokes: [...ann.strokes, { id: uid(), points: draft, note: "" }] });
    setDraft(null);
  }

  const total = ann.markers.length + ann.strokes.length;

  return (
    <div
      data-board-item
      className={cn(
        "absolute rounded-xl bg-card shadow-pw-card transition-shadow",
        selected ? "ring-2 ring-accent" : "ring-1 ring-border",
      )}
      style={{ left: section.x, top: section.y, width: CARD_W }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        className="flex cursor-move items-center gap-2 border-b px-3 py-2"
        onPointerDown={(e) => {
          onSelect();
          startDrag(e, k, onMove, onMoveEnd);
        }}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 truncate font-pw-display text-sm font-semibold">{section.title}</span>
        {section.in_page && (
          <span className="rounded-full bg-pw-success/15 px-2 py-0.5 text-[10px] font-medium text-pw-success">
            Page #{section.page_order + 1}
          </span>
        )}
        {total > 0 && (
          <span className="rounded-full bg-pw-marker/15 px-2 py-0.5 text-[10px] font-medium text-pw-marker">{total} note{total > 1 ? "s" : ""}</span>
        )}
        {selected && section.html && (
          <div className="flex gap-0.5 rounded-md bg-muted p-0.5" onPointerDown={(e) => e.stopPropagation()}>
            {([["none", MousePointer2, "Sélection"], ["pin", MapPin, "Marqueur"], ["pen", PenLine, "Dessin"]] as const).map(([t, I, l]) => (
              <button
                key={t}
                title={l}
                onClick={() => onTool(t)}
                className={cn("rounded p-1", tool === t ? "bg-card text-accent shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <I className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-b-xl">
        {section.html ? (
          <Frame ref={frameRef} id={section.id} html={section.html} design={design} scale={SCALE} />
        ) : (
          <div className="grid h-56 place-items-center p-6 text-center text-sm text-muted-foreground">
            {generating ? "" : "Décrivez cette section dans le panneau de droite puis cliquez sur « Générer »."}
          </div>
        )}

        {/* annotations layer */}
        <div
          ref={overlay}
          className={cn("absolute inset-0", active ? (tool === "pen" ? "cursor-crosshair" : "cursor-copy") : "pointer-events-none")}
          onPointerDown={active ? down : undefined}
          onPointerMove={active ? move : undefined}
          onPointerUp={active ? up : undefined}
        >
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
            {[...ann.strokes.map((s) => s.points), ...(draft ? [draft] : [])].map((pts, i) => (
              <polyline
                key={i}
                points={pts.map((p) => p.join(",")).join(" ")}
                fill="none"
                className="stroke-pw-ink"
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
          {ann.strokes.map((s, i) => (
            <span
              key={s.id}
              className="absolute grid h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-pw-ink px-1 text-[10px] font-bold text-primary-foreground"
              style={{ left: `${(s.points[0]?.[0] ?? 0) * 100}%`, top: `${(s.points[0]?.[1] ?? 0) * 100}%` }}
            >
              D{i + 1}
            </span>
          ))}
          {ann.markers.map((m, i) => (
            <span
              key={m.id}
              className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-full place-items-center rounded-full rounded-bl-none bg-pw-marker text-[11px] font-bold text-accent-foreground shadow-pw-card"
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
            >
              {i + 1}
            </span>
          ))}
        </div>

        {generating && (
          <div className="absolute inset-0 grid place-items-center bg-card/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-accent" /> Construction de la section…
            </div>
          </div>
        )}
      </div>
      {section.status === "ready" && !generating && section.html && selected && tool !== "none" && (
        <div className="flex items-center gap-1.5 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          <Check className="h-3 w-3" /> {tool === "pin" ? "Cliquez pour placer un marqueur" : "Dessinez pour entourer une zone"} — notez vos indications à droite.
        </div>
      )}
    </div>
  );
}
