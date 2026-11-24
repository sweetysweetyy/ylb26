import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatAboutEntityFn, listConversationFn } from "@/feeloo/lib/ai.functions";
import { Button } from "@/feeloo/components/ui/button";
import { Textarea } from "@/feeloo/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";

export function AiChatPanel({ entityType, entityId }: { entityType: "candidate" | "job"; entityId: string }) {
  const chat = useServerFn(chatAboutEntityFn);
  const list = useServerFn(listConversationFn);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    list({ data: { entityType, entityId } }).then((r: any) => { setConversationId(r.conversationId); setMessages(r.messages ?? []); });
  }, [entityId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput(""); setLoading(true);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    try {
      const r = await chat({ data: { entityType, entityId, conversationId: conversationId ?? undefined, message: msg } });
      setConversationId(r.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Erreur IA: ${e?.message ?? e}` }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-[540px]">
      <div ref={scrollRef} className="flex-1 overflow-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-10">
            <Sparkles className="size-6 mx-auto mb-2 text-accent" />
            Pose une question sur ce {entityType === "candidate" ? "candidat" : "poste"} : forces, risques, questions d'entretien, alignement culture…
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
            <div className={m.role === "user" ? "max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm" : "max-w-[90%] rounded-2xl bg-white/70 px-4 py-3 text-sm whitespace-pre-wrap"}>{m.content}</div>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground animate-pulse">IA en réflexion…</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Poser une question…" className="resize-none min-h-[48px] bg-white/60"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button onClick={send} disabled={loading || !input.trim()}><Send className="size-4" /></Button>
      </div>
    </div>
  );
}