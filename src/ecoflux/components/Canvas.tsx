import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { formatDuration } from "@/ecoflux/lib/engine";
import { meta } from "@/ecoflux/lib/data";
import type { PEdge, PNode } from "@/ecoflux/lib/types";
import { cn } from "@/lib/utils";
import { nodeSize, shapeClass, tone, TONE_BORDER, TONE_TEXT, TONE_VAR, TYPE_ICON } from "./grammar";

type View = { x: number; y: number; k: number };
const MIN = 0.3, MAX = 2.2;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

export type CanvasProps = {
  nodes: PNode[];
  edges: PEdge[];
  selectedId: string | null;
  highlightId: string | null;
  focusKey: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number, commit: boolean) => void;
  overlay?: (node: PNode, pos: { x: number; y: number; w: number; h: number }) => React.ReactNode;
  footer?: React.ReactNode;
  badge?: (node: PNode) => React.ReactNode;
  marked?: { nodes: Set<string>; edges: Set<string> } | null;
};

export function Canvas({ nodes, edges, selectedId, highlightId, focusKey, onSelect, onMove, overlay, footer, badge, marked }: CanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 0.92 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ kind: "pan" | "node"; id?: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el || nodes.length === 0) return;
    const xs = nodes.map((n) => Number(n.position_x)), ys = nodes.map((n) => Number(n.position_y));
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...nodes.map((n) => Number(n.position_x) + nodeSize(n.action_type).w));
    const maxY = Math.max(...nodes.map((n) => Number(n.position_y) + nodeSize(n.action_type).h)) + 200;
    const r = el.getBoundingClientRect();
    const k = clamp(Math.min(0.92, (r.width - 60) / (maxX - minX), (r.height - 100) / (maxY - minY)));
    setView({ k, x: 24 - minX * k + Math.max(0, (r.width - 48 - (maxX - minX) * k) / 2) * 0, y: 70 - minY * k });
  }, [nodes]);

  // fit once when the flow (As-Is / To-Be / process) changes
  const fitKey = nodes.map((n) => n.id).sort().join();
  const lastFit = useRef("");
  useLayoutEffect(() => {
    if (fitKey && lastFit.current !== fitKey.slice(0, 80)) {
      lastFit.current = fitKey.slice(0, 80);
      fit();
    }
  }, [fitKey, fit]);

  // pan to a node when requested (traceability)
  useEffect(() => {
    if (!focusKey) return;
    const id = focusKey.split(":")[0];
    const n = nodes.find((x) => x.id === id);
    const el = ref.current;
    if (!n || !el) return;
    const r = el.getBoundingClientRect();
    const { k } = viewRef.current;
    const nx = Number(n.position_x) * k, ny = Number(n.position_y) * k;
    const cur = viewRef.current;
    const visible = nx + cur.x > 0 && nx + cur.x < r.width - 160 && ny + cur.y > 0 && ny + cur.y < r.height - 320;
    if (!visible) setView({ k, x: r.width / 2 - nx - 74 * k, y: r.height / 3 - ny });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const zoomAt = (next: number, px: number, py: number) => {
    setView((v) => {
      const k2 = clamp(next);
      const f = k2 / v.k;
      return { k: k2, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (!e.shiftKey) {
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
        zoomAt(viewRef.current.k * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
        return;
      }
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent, nodeId?: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    if (nodeId) {
      const n = nodes.find((x) => x.id === nodeId)!;
      drag.current = { kind: "node", id: nodeId, sx: e.clientX, sy: e.clientY, ox: Number(n.position_x), oy: Number(n.position_y), moved: false };
    } else {
      drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.kind === "pan") setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
    else if (d.moved && d.id) onMove(d.id, Math.round(d.ox + dx / view.k), Math.round(d.oy + dy / view.k), false);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === "node" && d.id) {
      if (d.moved) onMove(d.id, Math.round(d.ox + (e.clientX - d.sx) / view.k), Math.round(d.oy + (e.clientY - d.sy) / view.k), true);
      else onSelect(d.id);
    } else if (!d.moved) onSelect(null);
  };

  const pos = (n: PNode) => ({ x: Number(n.position_x), y: Number(n.position_y), ...nodeSize(n.action_type) });

  const edgePath = (a: PNode, b: PNode) => {
    const p = pos(a), q = pos(b);
    const ca = { x: p.x + p.w / 2, y: p.y + p.h / 2 }, cb = { x: q.x + q.w / 2, y: q.y + q.h / 2 };
    const dx = cb.x - ca.x, dy = cb.y - ca.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const s = Math.sign(dx) || 1;
      const x1 = ca.x + (s * p.w) / 2, x2 = cb.x - (s * q.w) / 2;
      const m = (x2 - x1) / 2;
      return `M${x1},${ca.y} C${x1 + m},${ca.y} ${x2 - m},${cb.y} ${x2},${cb.y}`;
    }
    const s = Math.sign(dy) || 1;
    const y1 = ca.y + (s * p.h) / 2, y2 = cb.y - (s * q.h) / 2;
    const m = (y2 - y1) / 2;
    return `M${ca.x},${y1} C${ca.x},${y1 + m} ${cb.x},${y2 - m} ${cb.x},${y2}`;
  };

  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={ref}
      className="eco-dots relative h-full w-full touch-none overflow-hidden rounded-[18px] border border-border bg-eco-eco-obsidian/60 select-none cursor-grab active:cursor-grabbing"
      style={{ backgroundSize: `${22 * view.k}px ${22 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      onPointerDown={(e) => onPointerDown(e)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
          {edges.map((e) => {
            const a = byId.get(e.source_node_id), b = byId.get(e.target_node_id);
            if (!a || !b) return null;
            const d = edgePath(a, b);
            const t = TONE_VAR[tone(b)];
            const hot = highlightId === a.id || highlightId === b.id || selectedId === a.id || selectedId === b.id;
            return (
              <g key={e.id}>
                <path d={d} fill="none" stroke={marked?.edges.has(e.id) ? "var(--eco-amber)" : "var(--border)"} strokeWidth={marked?.edges.has(e.id) ? 4 : 1.5} />
                <path d={d} fill="none" stroke={t} strokeOpacity={hot ? 0.9 : 0.45} strokeWidth={1.4} className="flow-dash" />
                <circle r={2.6} fill={t}>
                  <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
                </circle>
              </g>
            );
          })}
        </svg>
        {nodes.map((n) => {
          const p = pos(n);
          const m = meta(n);
          const tn = tone(n);
          const Icon = TYPE_ICON[n.action_type];
          const isSel = selectedId === n.id, isHi = highlightId === n.id;
          const sub = m.display ?? (n.assigned_role && n.action_type !== "operation" ? n.assigned_role : formatDuration(Number(n.cycle_time_minutes) + Number(n.wait_time_minutes)));
          const inner = (
            <div
              className={cn(
                "flex h-full w-full flex-col justify-center gap-0.5 border bg-card/90 backdrop-blur-md transition-shadow",
                shapeClass(n.action_type),
                TONE_BORDER[tn],
                isSel && "ring-1 ring-foreground/40",
                marked?.nodes.has(n.id) && "ring-2 ring-eco-amber",
              )}
            >
              <div className={cn("flex items-center gap-1 text-[11px]", TONE_TEXT[tn])}>
                <Icon className="size-2.5" />
                <span className="truncate">{m.tag || (n.action_type === "event" ? "Événement" : m.ref)}</span>
              </div>
              <div className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">{n.label}</div>
              {n.action_type !== "event" && <div className="truncate text-[11px] text-muted-foreground">{sub}</div>}
            </div>
          );
          return (
            <div
              key={n.id}
              data-node={m.ref}
              className="absolute cursor-pointer"
              style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
              onPointerDown={(e) => onPointerDown(e, n.id)}
            >
              {badge && <div className="pointer-events-none absolute -top-2.5 right-2 z-10 flex gap-1">{badge(n)}</div>}
              {isHi ? <div className="eco-holo-card h-full w-full rounded-[15px] p-0 eco-glow-magenta [&>div]:border-0">{inner}</div> : inner}
            </div>
          );
        })}
        {nodes.map((n) => (highlightId === n.id && overlay ? <div key={`o-${n.id}`}>{overlay(n, pos(n))}</div> : null))}
      </div>

      {nodes.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Aucune étape sur ce flux pour l'instant.</div>
      )}

      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-border bg-card/80 px-1.5 py-1 text-[11px] text-muted-foreground backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
        <button aria-label="Dézoomer" className="grid size-6 place-items-center rounded-full hover:bg-accent" onClick={() => { const r = ref.current!.getBoundingClientRect(); zoomAt(view.k / 1.2, r.width / 2, r.height / 2); }}><Minus className="size-3" /></button>
        <span className="w-10 text-center tabular-nums">{Math.round(view.k * 100)} %</span>
        <button aria-label="Zoomer" className="grid size-6 place-items-center rounded-full hover:bg-accent" onClick={() => { const r = ref.current!.getBoundingClientRect(); zoomAt(view.k * 1.2, r.width / 2, r.height / 2); }}><Plus className="size-3" /></button>
        <button aria-label="Recentrer" className="grid size-6 place-items-center rounded-full hover:bg-accent" onClick={fit}><Maximize2 className="size-3" /></button>
      </div>
      {footer}
    </div>
  );
}
