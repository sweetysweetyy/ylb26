import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Download,
  LogOut,
  Play,
  Printer,
  QrCode,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { qf } from "@/queueflow/lib/db";
const supabase = qf(sb);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/queueflow/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — FilaPro" },
      { name: "description", content: "Pilotez votre file d'attente en temps réel : QR Code, clients présents et ordre de passage." },
      { property: "og:title", content: "Tableau de bord — FilaPro" },
      { property: "og:description", content: "Votre salle d'attente en temps réel." },
    ],
  }),
  component: Dashboard,
});

type Queue = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type Entry = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  reason: string | null;
  status: string;
  ticket_number: number;
  sort_order: number;
  created_at: string;
};

function randomSlug() {
  return Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [newName, setNewName] = useState("File principale");
  const [qrOpen, setQrOpen] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const loadEntries = useCallback(async (queueId: string) => {
    const { data } = await supabase
      .from("qf_queue_entries")
      .select("*")
      .eq("queue_id", queueId)
      .order("sort_order", { ascending: true });
    setEntries((data ?? []) as Entry[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qf_queues")
        .select("id, name, slug, is_active, business_name")
        .order("created_at", { ascending: true })
        .limit(1);
      const q = (data?.[0] as Queue | undefined) ?? null;
      setQueue(q);
      setBusinessName((data?.[0] as { business_name?: string } | undefined)?.business_name ?? "");
      if (q) await loadEntries(q.id);
      setLoading(false);
    })();
  }, [loadEntries]);

  useEffect(() => {
    if (!queue) return;
    const channel = supabase
      .channel(`queue-${queue.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qf_queue_entries", filter: `queue_id=eq.${queue.id}` },
        () => {
          void loadEntries(queue.id);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queue, loadEntries]);

  const waiting = useMemo(() => entries.filter((e) => e.status === "waiting"), [entries]);
  const serving = useMemo(() => entries.find((e) => e.status === "serving") ?? null, [entries]);
  const doneToday = useMemo(
    () =>
      entries.filter(
        (e) => e.status === "done" && new Date(e.created_at).toDateString() === new Date().toDateString(),
      ).length,
    [entries],
  );

  const publicUrl = queue && origin ? `${origin}/queueflow-q/${queue.slug}` : "";

  async function createQueue() {
    const { data, error } = await supabase
      .from("qf_queues")
      .insert({
        name: newName.trim() || "File principale",
        slug: randomSlug(),
        owner_id: (await supabase.auth.getUser()).data.user!.id,
      })
      .select("id, name, slug, is_active")
      .single();
    if (error) {
      toast.error("Création impossible");
      return;
    }
    setQueue(data as Queue);
    toast.success("File créée et activée");
  }

  async function toggleActive(active: boolean) {
    if (!queue) return;
    setQueue({ ...queue, is_active: active });
    await supabase.from("qf_queues").update({ is_active: active }).eq("id", queue.id);
  }

  async function setStatus(entry: Entry, status: string) {
    await supabase
      .from("qf_queue_entries")
      .update({ status, served_at: status === "serving" ? new Date().toISOString() : null })
      .eq("id", entry.id);
    if (queue) await loadEntries(queue.id);
  }

  async function move(entry: Entry, direction: -1 | 1) {
    const idx = waiting.findIndex((e) => e.id === entry.id);
    const target = waiting[idx + direction];
    if (!target) return;
    await Promise.all([
      supabase.from("qf_queue_entries").update({ sort_order: target.sort_order }).eq("id", entry.id),
      supabase.from("qf_queue_entries").update({ sort_order: entry.sort_order }).eq("id", target.id),
    ]);
    if (queue) await loadEntries(queue.id);
  }

  async function callNext() {
    if (serving) await setStatus(serving, "done");
    const next = waiting[0];
    if (next) await setStatus(next, "serving");
    else toast.info("Plus personne dans la file");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function downloadQr() {
    const svg = document.getElementById("queue-qr");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode-file-attente.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="queueflow-theme flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="queueflow-theme min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-display text-lg font-bold">
              Fila<span className="text-accent">Pro</span>
            </p>
            <p className="text-xs text-muted-foreground">{businessName || "Espace professionnel"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> Déconnexion
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {!queue ? (
          <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 shadow-[var(--shadow-soft)]">
            <h1 className="text-xl font-bold">Créez votre file d'attente</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Donnez-lui un nom : votre QR Code sera généré immédiatement.
            </p>
            <div className="mt-6 space-y-2">
              <Label htmlFor="qname">Nom de la file</Label>
              <Input id="qname" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} />
            </div>
            <Button className="mt-4 w-full" onClick={createQueue}>
              Créer et activer
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{queue.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Lien public : <span className="font-medium text-foreground">{publicUrl}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                  <Switch checked={queue.is_active} onCheckedChange={toggleActive} id="active" />
                  <Label htmlFor="active" className="text-sm">
                    {queue.is_active ? "File ouverte" : "File fermée"}
                  </Label>
                </div>
                <Button variant="outline" onClick={() => setQrOpen(true)}>
                  <QrCode className="size-4" /> QR Code
                </Button>
                <Button onClick={callNext}>
                  <Play className="size-4" /> Appeler le suivant
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: "En attente", value: waiting.length, icon: Users },
                { label: "En cours", value: serving ? 1 : 0, icon: Clock },
                { label: "Traités aujourd'hui", value: doneToday, icon: Check },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <s.icon className="size-4 text-muted-foreground" />
                  </div>
                  <p className="font-display mt-2 text-3xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>

            {serving && (
              <div className="bg-hero mt-6 rounded-2xl p-5 text-primary-foreground">
                <p className="text-xs tracking-widest uppercase opacity-70">Actuellement au guichet</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-bold">
                      #{serving.ticket_number} — {serving.full_name}
                    </p>
                    <p className="text-sm opacity-80">
                      {serving.phone}
                      {serving.reason ? ` · ${serving.reason}` : ""}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setStatus(serving, "done")}>
                    <Check className="size-4" /> Terminer
                  </Button>
                </div>
              </div>
            )}

            <h2 className="mt-8 text-lg font-semibold">Personnes dans la file</h2>
            <div className="mt-3 space-y-3">
              {waiting.length === 0 && (
                <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                  Personne dans la file pour le moment. Affichez votre QR Code pour que vos clients la
                  rejoignent.
                </div>
              )}
              {waiting.map((e, i) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]"
                >
                  <span className="font-display flex size-11 items-center justify-center rounded-xl bg-secondary text-sm font-bold">
                    #{e.ticket_number}
                  </span>
                  <div className="min-w-40 flex-1">
                    <p className="font-semibold">{e.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {e.phone}
                      {e.email ? ` · ${e.email}` : ""}
                    </p>
                    {e.reason && <p className="mt-1 text-sm text-muted-foreground italic">{e.reason}</p>}
                  </div>
                  <Badge variant="secondary">Position {i + 1}</Badge>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => move(e, -1)} disabled={i === 0}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => move(e, 1)}
                      disabled={i === waiting.length - 1}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(e, "serving")}>
                      <Play className="size-4" /> Recevoir
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setStatus(e, "cancelled")}>
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code de votre file</DialogTitle>
            <DialogDescription>
              Affichez-le ou imprimez-le dans votre établissement. Vos clients le scannent pour
              rejoindre la file.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2 print:pt-10">
            {publicUrl && (
              <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <QRCode id="queue-qr" value={publicUrl} size={200} />
              </div>
            )}
            <p className="text-center text-xs break-all text-muted-foreground">{publicUrl}</p>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={downloadQr}>
                <Download className="size-4" /> Télécharger
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="size-4" /> Imprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
