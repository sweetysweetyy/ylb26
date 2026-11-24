import { useRef, type ReactNode } from "react";

export type View = { x: number; y: number; k: number };

export function Board({ view, setView, children, onBackgroundClick }: {
  view: View;
  setView: (fn: (v: View) => View) => void;
  children: ReactNode;
  onBackgroundClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pan = useRef<{ sx: number; sy: number; moved: boolean } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-board-item]")) return;
    pan.current = { sx: e.clientX, sy: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const p = pan.current;
    if (!p) return;
    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;
    if (Math.abs(dx) + Math.abs(dy) > 2) p.moved = true;
    p.sx = e.clientX;
    p.sy = e.clientY;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }
  function onPointerUp() {
    if (pan.current && !pan.current.moved) onBackgroundClick?.();
    pan.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    const rect = ref.current!.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setView((v) => {
        const k = Math.min(2, Math.max(0.15, v.k * Math.exp(-e.deltaY * 0.01)));
        return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k };
      });
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  }

  return (
    <div
      ref={ref}
      className="pw-board-grid absolute inset-0 touch-none overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ backgroundSize: `${22 * view.k}px ${22 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
        {children}
      </div>
    </div>
  );
}

/** Hook-free drag helper for items positioned in board coordinates. */
export function startDrag(
  e: React.PointerEvent,
  k: number,
  onMove: (dx: number, dy: number) => void,
  onEnd: () => void,
) {
  e.stopPropagation();
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  let lx = e.clientX;
  let ly = e.clientY;
  const move = (ev: PointerEvent) => {
    onMove((ev.clientX - lx) / k, (ev.clientY - ly) / k);
    lx = ev.clientX;
    ly = ev.clientY;
  };
  const up = () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    onEnd();
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
}
