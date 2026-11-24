import { Link } from "@tanstack/react-router";
import { Check, ChevronRight } from "lucide-react";
import type { Doc, DocType } from "@/skyvente/lib/types";
import { DOC_LABEL } from "@/skyvente/lib/types";

const STEPS: DocType[] = ["quote", "order", "invoice", "delivery"];

export function DocBreadcrumb({ chain, current }: { chain: Doc[]; current: Doc }) {
  const curIdx = STEPS.indexOf(current.type);
  return (
    <div className="sv-bento mb-6 flex flex-wrap items-center gap-1 p-2">
      {STEPS.map((s, i) => {
        const d = chain.filter((c) => c.type === s).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        const active = s === current.type;
        const done = !!d && i < curIdx;
        const inner = (
          <span
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
              active ? "sv-bg-holo font-semibold text-primary-foreground" : d ? "text-foreground hover:bg-accent/60" : "text-muted-foreground/50"
            }`}
          >
            <span className={`grid size-5 place-items-center rounded-full text-[10px] ${active ? "bg-background/30" : "border border-border"}`}>
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            {DOC_LABEL[s]}
            {d?.number && <span className="text-xs opacity-70">{d.number}</span>}
          </span>
        );
        return (
          <div key={s} className="flex items-center">
            {d && !active ? (
              <Link to="/skyvente/documents/$id" params={{ id: d.id }}>{inner}</Link>
            ) : (
              inner
            )}
            {i < STEPS.length - 1 && <ChevronRight className="size-4 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}
