import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listConversationsWithProspect, listMessagesInConversation } from "@/pascal/lib/prospects.functions";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { MessagesSquare, Sparkles, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Search = z.object({ id: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/pascal/conversations")({
  component: ConversationsPage,
  validateSearch: (s) => Search.parse(s),
});

const STATUS_TONE: Record<string, string> = {
  new: "bg-accent/20 text-accent border-accent/40",
  contacted: "bg-primary/15 text-primary border-primary/40",
  replied: "bg-chart-2/15 text-chart-2 border-chart-2/40",
  meeting_booked: "bg-success/20 text-success border-success/40",
  lost: "bg-destructive/15 text-destructive border-destructive/40",
  paused: "bg-warning/15 text-warning border-warning/40",
};

function ConversationsPage() {
  const search = Route.useSearch();
  const nav = useNavigate({ from: "/pascal/conversations" });
  const list = useQuery({ queryKey: ["conversations"], queryFn: () => listConversationsWithProspect() });
  const activeId = search.id ?? list.data?.[0]?.id;
  const msgs = useQuery({
    queryKey: ["conv-msgs", activeId],
    queryFn: () => listMessagesInConversation({ data: { conversationId: activeId! } }),
    enabled: !!activeId,
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><MessagesSquare className="size-7 text-primary" /> Conversations</h1>
        <p className="text-sm text-muted-foreground">Fil complet des échanges menés par PASCAL.</p>
      </header>
      <div className="grid lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-200px)]">
        <aside className="bento overflow-y-auto p-2 space-y-1.5">
          {(list.data ?? []).map((c, i) => {
            const p = c.prospects as unknown as { full_name: string | null; email: string; company: string | null; status: string } | null;
            const active = c.id === activeId;
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                whileHover={{ x: 2 }}
                onClick={() => nav({ search: { id: c.id } })}
                className={`w-full text-left p-3 rounded-lg border transition-all ${active ? "bg-primary/15 border-primary/40 shadow-lg" : "border-transparent hover:bg-sidebar-accent/50"}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate text-sm">{p?.full_name ?? p?.email}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono">{p?.company ?? p?.email}</div>
                  </div>
                  {p?.status && <Badge variant="outline" className={`text-[9px] shrink-0 ${STATUS_TONE[p.status] ?? ""}`}>{p.status}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 truncate">{c.subject ?? "(sans objet)"}</div>
              </motion.button>
            );
          })}
          {(list.data ?? []).length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Aucune conversation.</div>}
        </aside>

        <section className="bento bento-glow flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeId ? (
              <motion.div key={activeId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-6 space-y-4">
                {(msgs.data ?? []).map((m, i) => {
                  const isPascal = m.role === "pascal";
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.04, 0.4) }}
                      className={`flex ${isPascal ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl relative ${isPascal ? "surface-1 border-primary/50 border" : "surface-2"}`}>
                        {isPascal && <div className="absolute -inset-2 -z-10 bg-gradient-to-r from-primary/20 to-transparent blur-lg rounded-3xl" />}
                        <div className="text-xs text-muted-foreground mb-1 font-mono flex items-center gap-1.5">
                          {isPascal ? <><Sparkles className="size-3 text-primary" /> PASCAL</> : <><Send className="size-3" /> Prospect</>}
                          <span>·</span>
                          <span>{new Date(m.sent_at).toLocaleString("fr-FR")}</span>
                        </div>
                        {m.subject && <div className="font-medium text-sm mb-2">{m.subject}</div>}
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{m.body}</pre>
                      </div>
                    </motion.div>
                  );
                })}
                {(msgs.data ?? []).length === 0 && <div className="text-center text-sm text-muted-foreground">Aucun message.</div>}
              </motion.div>
            ) : (
              <div className="flex-1 grid place-items-center text-muted-foreground text-sm">Sélectionnez une conversation.</div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}