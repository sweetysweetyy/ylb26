import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAgentConfig, updateAgentConfig } from "@/pascal/lib/agent-config.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Brain, Sparkles, MessageSquare, ShieldAlert, HeartHandshake } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/pascal/instructions")({ component: InstructionsPage });

function InstructionsPage() {
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ["agent-config"], queryFn: () => getAgentConfig() });
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (cfg.data) setF(cfg.data); }, [cfg.data]);
  const save = useMutation({
    mutationFn: () => updateAgentConfig({ data: f }),
    onSuccess: () => { toast.success("Instructions PASCAL enregistrées."); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });
  if (!f) return <div className="text-muted-foreground text-sm">Chargement…</div>;
  const up = (k: string, v: any) => setF({ ...f, [k]: v });

  const cards = [
    { key: "system_prompt", label: "Prompt système maître", icon: Brain, desc: "Le cerveau de PASCAL. Décrivez qui il est, ce qu'il vend, comment il pense. Ces règles s'appliquent à chaque message.", rows: 10, placeholder: "Tu es PASCAL, directeur commercial senior spécialisé dans le High-Ticket…" },
    { key: "greeting", label: "Salutation d'ouverture", icon: HeartHandshake, desc: "Le tout premier mot au prospect. Variables: {{first_name}}, {{company}}.", rows: 3, placeholder: "Bonjour {{first_name}}," },
    { key: "mood_rules", label: "Règles d'humeur & d'empathie", icon: MessageSquare, desc: "Comment adapter le ton selon la réponse du prospect (froid, chaud, énervé, ghosté).", rows: 6, placeholder: "Si le prospect semble pressé → email court, punchy…" },
    { key: "persistence_rules", label: "Règles de persistance", icon: ShieldAlert, desc: "Quand relancer, quand lâcher, quand relancer différemment.", rows: 6, placeholder: "3 relances max espacées de 48h/72h/7j puis mise en plan d'action nurturing…" },
  ] as const;

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><Sparkles className="size-7 text-primary" /> Instructions avancées</h1>
          <p className="text-sm text-muted-foreground">Configurez le cœur cognitif de PASCAL : prompt système, humeur, persistance.</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="glow-primary press">
          <Save className="size-4 mr-2" /> Enregistrer
        </Button>
      </header>
      <div className="grid gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bento bento-glow p-5 space-y-3 relative">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg holo-border grid place-items-center"><Icon className="size-4 text-primary" /></div>
                <div>
                  <Label className="text-base font-medium">{c.label}</Label>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
              {c.rows > 4 ? (
                <Textarea rows={c.rows} placeholder={c.placeholder} value={f[c.key] ?? ""} onChange={(e) => up(c.key, e.target.value)} className="font-mono text-sm" />
              ) : (
                <Input placeholder={c.placeholder} value={f[c.key] ?? ""} onChange={(e) => up(c.key, e.target.value)} />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}