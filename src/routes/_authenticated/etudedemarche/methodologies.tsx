import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BookOpenCheck, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/etudedemarche/components/ui/badge";
import { Button } from "@/etudedemarche/components/ui/button";
import { Card } from "@/etudedemarche/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/etudedemarche/hooks/useAuth";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = baseSupabase as any;
import { useMethodologies } from "@/etudedemarche/lib/queries";

export const Route = createFileRoute("/_authenticated/etudedemarche/methodologies")({
  head: () => ({
    meta: [
      { title: "Méthodologies — Étude de marché" },
      {
        name: "description",
        content: "Enregistrez vos méthodologies, conseils et astuces : l'IA les suit fidèlement à chaque étude.",
      },
      { property: "og:title", content: "Méthodologies — Étude de marché" },
      { property: "og:description", content: "Vos règles métier appliquées à chaque étude de marché." },
    ],
  }),
  component: MethodologiesPage,
});

const CATEGORIES = [
  { id: "methodologie", label: "Méthodologie" },
  { id: "conseil", label: "Conseil" },
  { id: "astuce", label: "Astuce" },
  { id: "redaction", label: "Style de rédaction" },
  { id: "source", label: "Sources à privilégier" },
];

function MethodologiesPage() {
  const { user } = useAuth();
  const { data: items = [] } = useMethodologies();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("methodologie");
  const [priority, setPriority] = useState("2");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["methodologies"] });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("edm_methodologies").insert({
        user_id: user!.id,
        title,
        content,
        category,
        priority: Number(priority),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      toast.success("Règle enregistrée : elle sera appliquée aux prochaines études.");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("edm_methodologies").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("edm_methodologies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Règle supprimée.");
      void invalidate();
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="halo">
        <Badge variant="live">Cadre imposé à l'IA</Badge>
        <h1 className="mt-3 font-display text-3xl">Méthodologies, conseils & astuces</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tout ce que vous écrivez ici est injecté dans le moteur d'analyse et suivi fidèlement lors
          de chaque étude. Les règles de priorité la plus haute passent en premier.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card variant="bento" className="space-y-4 p-6 lg:col-span-2">
          <h2 className="font-display text-lg">Nouvelle règle</h2>
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Toujours citer l'INSEE"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Contenu</Label>
            <Textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Détaillez la méthode, le conseil ou l'astuce que l'IA doit appliquer…"
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Normale</SelectItem>
                  <SelectItem value="2">Haute</SelectItem>
                  <SelectItem value="3">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="holo"
            className="w-full"
            disabled={!title.trim() || !content.trim() || add.isPending}
            onClick={() => add.mutate()}
          >
            <Plus /> Ajouter la règle
          </Button>
        </Card>

        <div className="space-y-3 lg:col-span-3">
          {items.length === 0 && (
            <Card variant="bento" className="p-10 text-center text-sm text-muted-foreground">
              <BookOpenCheck className="mx-auto mb-3 h-5 w-5" />
              Aucune règle. Sans consigne, l'IA applique les standards du métier.
            </Card>
          )}
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card variant="bento" className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base">{item.title}</h3>
                      <Badge variant="outline">
                        {CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category}
                      </Badge>
                      {item.priority >= 3 && <Badge variant="holo">Critique</Badge>}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">
                      {item.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(v) => toggle.mutate({ id: item.id, is_active: v })}
                    />
                    <button
                      onClick={() => remove.mutate(item.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}