import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTools, upsertTool, deleteTool, TOOL_CATALOG } from "@/pascal/lib/tools.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/pascal/tools")({ component: ToolsPage });

function ToolsPage() {
  const qc = useQueryClient();
  const tools = useQuery({ queryKey: ["agent-tools"], queryFn: () => listTools() });
  const [editing, setEditing] = useState<any | null>(null);
  const save = useMutation({
    mutationFn: (row: any) => upsertTool({ data: row }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-tools"] }); setEditing(null); toast.success("Outil enregistré."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteTool({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-tools"] }); toast.success("Outil supprimé."); },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><Wrench className="size-7" /> Outils de l'agent</h1>
          <p className="text-sm text-muted-foreground">Ajoute des outils que PASCAL pourra utiliser pour construire des automatisations complexes.</p>
        </div>
        <Button className="glow-primary press" onClick={() => setEditing({ name: "", kind: "webhook", description: "", config: {}, enabled: true })}>
          <Plus className="size-4 mr-2" /> Nouvel outil
        </Button>
      </header>

      {editing && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bento bento-glow p-6 space-y-4">
          <h2 className="font-display text-lg">{editing.id ? "Modifier l'outil" : "Nouvel outil"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Slack Sales Channel" />
            </div>
            <div className="space-y-1.5">
              <Label>Type d'outil</Label>
              <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOOL_CATALOG.map((t) => (<SelectItem key={t.kind} value={t.kind}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description (utilisée par PASCAL pour savoir quand appeler l'outil)</Label>
            <Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <ConfigFields kind={editing.kind} config={editing.config ?? {}} onChange={(c) => setEditing({ ...editing, config: c })} />
          <div className="flex items-center gap-3 pt-2">
            <Switch checked={editing.enabled} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} />
            <Label>Activé</Label>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
            <Button className="glow-primary" onClick={() => save.mutate(editing)} disabled={save.isPending || !editing.name}>Enregistrer</Button>
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {(tools.data ?? []).map((t: any) => {
          const cat = TOOL_CATALOG.find((c) => c.kind === t.kind);
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bento p-5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg">{t.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{cat?.label ?? t.kind}</div>
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded-full ${t.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{t.enabled ? "Actif" : "Off"}</div>
              </div>
              {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="press" onClick={() => setEditing(t)}>Modifier</Button>
                <Button size="sm" variant="ghost" className="press text-destructive" onClick={() => del.mutate(t.id)}><Trash2 className="size-3.5 mr-1" /> Supprimer</Button>
              </div>
            </motion.div>
          );
        })}
        {tools.data && tools.data.length === 0 && !editing && (
          <div className="bento p-8 col-span-full text-center text-sm text-muted-foreground">Aucun outil pour le moment. Ajoute-en un pour élargir les capacités de PASCAL.</div>
        )}
      </div>
    </div>
  );
}

function ConfigFields({ kind, config, onChange }: { kind: string; config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const cat = TOOL_CATALOG.find((c) => c.kind === kind);
  if (!cat || cat.fields.length === 0) return null;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {cat.fields.map((f) => (
        <div key={f} className="space-y-1.5">
          <Label className="capitalize">{f.replace(/_/g, " ")}</Label>
          <Input value={(config[f] as string) ?? ""} onChange={(e) => onChange({ ...config, [f]: e.target.value })} placeholder={f} type={f.includes("token") || f.includes("key") || f.includes("secret") ? "password" : "text"} />
        </div>
      ))}
    </div>
  );
}