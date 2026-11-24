import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAgentConfig, updateAgentConfig } from "@/pascal/lib/agent-config.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Bot } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pascal/agent")({ component: AgentPage });

function AgentPage() {
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ["agent-config"], queryFn: () => getAgentConfig() });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (cfg.data) setForm(cfg.data); }, [cfg.data]);

  const save = useMutation({
    mutationFn: () => updateAgentConfig({ data: form }),
    onSuccess: () => { toast.success("Personnalite PASCAL mise a jour."); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  if (!form) return <div className="text-muted-foreground text-sm">Chargement…</div>;

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2"><Bot className="size-7 text-primary" /> Personnalite de PASCAL</h1>
          <p className="text-sm text-muted-foreground">Donnez a PASCAL son identite, son ton et ses garde-fous.</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="glow-primary">
          <Save className="size-4 mr-2" /> Enregistrer
        </Button>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <Field label="Nom de l'agent" desc="Identite interne.">
          <Input value={form.agent_name} onChange={(e) => update("agent_name", e.target.value)} />
        </Field>
        <Field label="Nom qui signe les emails" desc="Le nom que verra le prospect.">
          <Input value={form.sender_name} onChange={(e) => update("sender_name", e.target.value)} />
        </Field>
        <Field label="Role / fonction" desc="Ex: Directeur commercial.">
          <Input value={form.sender_role} onChange={(e) => update("sender_role", e.target.value)} />
        </Field>
        <Field label="Langue">
          <Select value={form.language} onValueChange={(v) => update("language", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Francais</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Signature" desc="Bloc signature ajoute en fin d'email.">
        <Textarea rows={4} value={form.signature} onChange={(e) => update("signature", e.target.value)} />
      </Field>
      <Field label="Ton et style" desc="Decrivez la voix de PASCAL : direct, chaleureux, expert.">
        <Textarea rows={4} value={form.tone} onChange={(e) => update("tone", e.target.value)} />
      </Field>
      <Field label="Objectifs (mission)" desc="Ce que PASCAL doit accomplir en priorite.">
        <Textarea rows={4} value={form.goals} onChange={(e) => update("goals", e.target.value)} />
      </Field>
      <Field label="Garde-fous" desc="Ce que PASCAL ne doit jamais faire.">
        <Textarea rows={4} value={form.guardrails} onChange={(e) => update("guardrails", e.target.value)} />
      </Field>

      <div className="grid lg:grid-cols-3 gap-4">
        <Field label="Reponses automatiques" desc="PASCAL repond aux prospects sans intervention.">
          <Switch checked={form.autonomous_replies} onCheckedChange={(v) => update("autonomous_replies", v)} />
        </Field>
        <Field label="Nb de relances max">
          <Input type="number" min={0} max={10} value={form.max_followups} onChange={(e) => update("max_followups", parseInt(e.target.value || "0"))} />
        </Field>
        <Field label="Delai entre relances (heures)">
          <Input type="number" min={1} max={720} value={form.followup_delay_hours} onChange={(e) => update("followup_delay_hours", parseInt(e.target.value || "1"))} />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="surface-1 p-4 space-y-2">
      <Label>{label}</Label>
      {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      <div>{children}</div>
    </div>
  );
}