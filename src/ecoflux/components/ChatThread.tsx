import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { author, exchangeNo } from "@/ecoflux/lib/context";
import type { ChatMessage } from "@/ecoflux/lib/types";
import { cn } from "@/lib/utils";

export function Avatar({ name }: { name: string }) {
  return <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-semibold">{name.slice(0, 1)}</span>;
}

export function Messages({ messages, all, pending, empty }: { messages: ChatMessage[]; all: ChatMessage[]; pending: boolean; empty: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [messages.length, pending]);
  return (
    <div className="space-y-3">
      {messages.length === 0 && !pending && <p className="text-[12px] text-muted-foreground">{empty}</p>}
      {messages.map((m) => {
        const mine = m.role === "user";
        const applied = (m.metadata as { applied?: string[] })?.applied ?? [];
        return (
          <div key={m.id} className={cn("flex flex-col gap-1", mine && "items-end")}>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {mine ? <Avatar name={author(m)} /> : <span className="size-3 rounded eco-aig" />}
              {author(m)} · échange {exchangeNo(m, all)}
            </div>
            <div className={cn("max-w-[92%] whitespace-pre-wrap text-[13px] leading-relaxed", mine ? "rounded-2xl rounded-tr-sm bg-secondary px-3 py-2" : "text-foreground")}>
              {m.content}
            </div>
            {applied.length > 0 && <span className="rounded-full border border-eco-eco-cyan/30 px-2 py-0.5 font-mono text-[10px] text-eco-cyan">→ canvas : {applied.join(", ")}</span>}
          </div>
        );
      })}
      {pending && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Le copilote analyse…
        </div>
      )}
      <div ref={end} />
    </div>
  );
}

export function Composer({ onSend, pending, placeholder, autoFocus, onFocus }: { onSend: (t: string) => void; pending: boolean; placeholder: string; autoFocus?: boolean; onFocus?: () => void }) {
  const [v, setV] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (!pending && autoFocus) ref.current?.focus(); }, [pending, autoFocus]);
  const submit = () => { if (!v.trim() || pending) return; onSend(v); setV(""); };
  return (
    <div className="flex items-end gap-2 rounded-[16px] border border-border bg-card/90 p-1.5 pl-3 backdrop-blur">
      <textarea
        ref={ref}
        rows={1}
        value={v}
        onFocus={onFocus}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        placeholder={placeholder}
        className="max-h-28 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[13px] outline-none placeholder:text-muted-foreground"
      />
      <button aria-label="Envoyer" disabled={!v.trim() || pending} onClick={submit} className="grid size-8 shrink-0 place-items-center rounded-full eco-aig text-primary-foreground disabled:opacity-40">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
      </button>
    </div>
  );
}
