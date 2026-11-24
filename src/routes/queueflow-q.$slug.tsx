import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, Loader2 } from "lucide-react";
import { getPublicQueue, joinQueue, joinSchema } from "@/queueflow/lib/queue.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/queueflow-q/$slug")({
  head: () => ({
    meta: [
      { title: "Rejoindre la file d'attente — FilaPro" },
      {
        name: "description",
        content: "Renseignez vos coordonnées pour prendre votre place dans la file d'attente.",
      },
      { property: "og:title", content: "Rejoindre la file d'attente" },
      { property: "og:description", content: "Prenez votre ticket en quelques secondes." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const fetchQueue = useServerFn(getPublicQueue);
  const join = useServerFn(joinQueue);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-queue", slug],
    queryFn: () => fetchQueue({ data: { slug } }),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = joinSchema.safeParse({ slug, ...form });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setSubmitting(true);
    try {
      const res = await join({ data: parsed.data });
      navigate({ to: "/queueflow-ticket/$entryId", params: { entryId: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de rejoindre la file");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="queueflow-theme flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="queueflow-theme flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">File introuvable</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ce QR Code n'est plus valide.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="queueflow-theme min-h-screen">
      <div className="bg-hero px-6 pt-12 pb-20 text-center">
        <p className="text-sm font-medium tracking-wide text-primary-foreground/70 uppercase">
          {data.business_name || "Établissement"}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-primary-foreground">{data.name}</h1>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 text-sm text-primary-foreground">
          <Users className="size-4" /> {data.waiting} personne{data.waiting > 1 ? "s" : ""} en attente
        </p>
      </div>

      <div className="mx-auto -mt-12 max-w-md px-5 pb-16">
        <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-lift)]">
          {data.is_active ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold">Rejoindre la file</h2>
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={30}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={160}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motif de la visite</Label>
                <Textarea
                  id="reason"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  maxLength={300}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Enregistrement…" : "Prendre ma place"}
              </Button>
            </form>
          ) : (
            <div className="py-6 text-center">
              <h2 className="text-lg font-semibold">File fermée</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                L'établissement n'accepte pas de nouvelles inscriptions pour le moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
