import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Loader2, Send, Sparkles, Wand2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fpSupabase as supabase } from "@/financierplan/lib/db";
import { refineSection, sendChatMessage } from "@/financierplan/lib/plan.functions";
import { SECTION_MAP, type SectionKey } from "@/financierplan/lib/sections";
import { Button } from "@/financierplan/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/financierplan/components/ui/badge";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: string; content: string; created_at: string };

export function ChatPanel({
  projectId,
  activeSection,
}: {
  projectId: string;
  activeSection: SectionKey;
}) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [suggestion, setSuggestion] = useState<{ section: SectionKey; instruction: string } | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  const chat = useServerFn(sendChatMessage);
  const refine = useServerFn(refineSection);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fp_chat_messages")
        .select("id, role, content, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Msg[];
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async (message: string) =>
      chat({ data: { projectId, message, sectionKey: activeSection } }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["messages", projectId] });
      if (res.target_section && res.suggested_instruction && SECTION_MAP[res.target_section as SectionKey]) {
        setSuggestion({
          section: res.target_section as SectionKey,
          instruction: res.suggested_instruction,
        });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apply = useMutation({
    mutationFn: async () =>
      refine({
        data: {
          projectId,
          sectionKey: suggestion!.section,
          instruction: suggestion!.instruction,
        },
      }),
    onSuccess: () => {
      setSuggestion(null);
      void qc.invalidateQueries({ queryKey: ["sections", projectId] });
      toast.success("Section mise à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    const value = input.trim();
    if (!value || send.isPending) return;
    setInput("");
    send.mutate(value);
  };

  return (
    <div className="no-print flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg holo-gradient">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold">Analyste IA</p>
            <p className="text-[11px] text-muted-foreground">
              Affine « {SECTION_MAP[activeSection]?.short} »
            </p>
          </div>
        </div>
        <Badge variant="live">en ligne</Badge>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Demandez par exemple : « Baisse le loyer à 900 € et recalcule le seuil de rentabilité »
            ou « Ajoute un second salarié en année 2 ».
          </div>
        )}
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-4 py-3 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "glass text-foreground",
              )}
            >
              {m.role === "user" ? (
                m.content
              ) : (
                <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:font-display">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {send.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> L'analyste calcule…
          </div>
        )}
        <AnimatePresence>
          {suggestion && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-primary/20 bg-secondary/40 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Modification proposée — {SECTION_MAP[suggestion.section]?.short}
              </p>
              <p className="mt-2 text-sm">{suggestion.instruction}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="holo"
                  onClick={() => apply.mutate()}
                  disabled={apply.isPending}
                >
                  {apply.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="size-3.5" />
                  )}
                  Appliquer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
                  Ignorer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border/50 p-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Affinez votre prévisionnel…"
            className="min-h-[84px] resize-none rounded-2xl pr-12"
          />
          <Button
            size="icon"
            variant="holo"
            className="absolute bottom-3 right-3 size-8 rounded-xl"
            onClick={submit}
            disabled={send.isPending}
            aria-label="Envoyer"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
