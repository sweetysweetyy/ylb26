import { forwardRef, useEffect, useMemo, useState } from "react";
import type { Design } from "@/pageweaver/lib/ai.functions";
import { buildDocument } from "@/pageweaver/lib/doc";
import { VIRTUAL_W } from "./types";

/** Scaled, non-interactive preview of an HTML fragment rendered at 1280px wide. */
export const Frame = forwardRef<HTMLIFrameElement, {
  id: string;
  html: string;
  design: Design;
  scale: number;
  onHeight?: (h: number) => void;
  minHeight?: number;
}>(function Frame({ id, html, design, scale, onHeight, minHeight = 360 }, ref) {
  const [h, setH] = useState(minHeight);
  const doc = useMemo(() => buildDocument(html, design, { frameId: id }), [html, design, id]);
  useEffect(() => {
    const fn = (e: MessageEvent) => {
      if (e.data?.__frame === id && typeof e.data.h === "number") {
        const nh = Math.max(120, Math.min(e.data.h, 6000));
        setH(nh);
        onHeight?.(nh);
      }
    };
    window.addEventListener("message", fn);
    return () => window.removeEventListener("message", fn);
  }, [id, onHeight]);
  return (
    <div style={{ width: VIRTUAL_W * scale, height: h * scale }} className="relative overflow-hidden">
      <iframe
        ref={ref}
        title={id}
        srcDoc={doc}
        sandbox="allow-scripts allow-same-origin"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white"
        style={{ width: VIRTUAL_W, height: h, transform: `scale(${scale})` }}
      />
    </div>
  );
});
