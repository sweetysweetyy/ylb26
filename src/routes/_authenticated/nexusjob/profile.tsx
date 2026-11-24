import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkles, Save, Plus, X } from "lucide-react";
import { useSession } from "@/nexusjob/hooks/use-session";
import { useProfile, upsertRow } from "@/nexusjob/hooks/use-app-data";
import { analyzeDocument, enrichProfile } from "@/nexusjob/lib/documents.functions";
import { PageContainer, PageHeader } from "@/nexusjob/components/page-header";
import { Card } from "@/nexusjob/components/ui/card";
import { Button } from "@/nexusjob/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/nexusjob/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRing } from "@/nexusjob/components/score-ring";

export const Route = createFileRoute("/_authenticated/nexusjob/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — NexusJob" },
      { name: "description", content: "Importez votre CV et votre lettre de motivation, l'IA construit et complète votre profil." },
      { property: "og:title", content: "Mon profil — NexusJob" },
      { property: "og:description", content: "Profil professionnel généré et enrichi par l'IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const label = (item: any) =>
  typeof item === "string" ? item : (item?.name ?? item?.title ?? item?.degree ?? item?.label ?? "");

function ProfilePage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(user?.id);
  const analyze = useServerFn(analyzeDocument);
  const enrich = useServerFn(enrichProfile);
  const cvRef = useRef<HTMLInputElement>(null);
  const letterRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [newSkill, setNewSkill] = useState("");
  const [tips, setTips] = useState<string[]>([]);

  const value = (key: string) => draft[key] ?? profile?.[key] ?? "";
  const skills: any[] = draft.skills ?? profile?.skills ?? [];

  const upload = async (file: File, kind: "cv" | "cover_letter") => {
    setBusy(kind);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await analyze({
        data: { kind, filename: file.name, base64, mime: file.type || "application/pdf" },
      });
      toast.success(`Document analysé (${result.characters} caractères) — profil mis à jour.`);
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse impossible.");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!user) return;
    setBusy("save");
    try {
      await upsertRow("nxj_profiles", user.id, draft);
      toast.success("Profil enregistré.");
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setBusy(null);
    }
  };

  const runEnrich = async () => {
    setBusy("enrich");
    try {
      const result = await enrich({});
      setTips([...result.improvements, ...result.targetRoles.map((r) => `Poste cible : ${r}`)]);
      toast.success("Profil optimisé par l'IA.");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Optimisation impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Mon profil"
        subtitle="Importez vos documents : l'IA extrait et structure toutes vos informations professionnelles."
        action={
          <div className="flex gap-2">
            <Button variant="nxj-glass" onClick={runEnrich} disabled={busy !== null}>
              {busy === "enrich" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Optimiser
            </Button>
            <Button variant="holo" onClick={save} disabled={busy !== null || Object.keys(draft).length === 0}>
              {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="holo" className="p-6">
          <div className="flex items-center gap-4">
            <ScoreRing score={Number(profile?.completion ?? 0)} size={78} label="profil" />
            <div>
              <p className="font-display text-lg font-semibold">{value("full_name") || "Profil"}</p>
              <p className="text-sm text-muted-foreground">{value("headline") || "Titre non renseigné"}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <input ref={cvRef} type="file" accept=".pdf,.txt" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cv")} />
            <input ref={letterRef} type="file" accept=".pdf,.txt" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover_letter")} />
            <Button variant="accent" className="w-full" onClick={() => cvRef.current?.click()} disabled={busy !== null}>
              {busy === "cv" ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} Importer mon CV (PDF)
            </Button>
            <Button variant="nxj-glass" className="w-full" onClick={() => letterRef.current?.click()} disabled={busy !== null}>
              {busy === "cover_letter" ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} Lettre de motivation
            </Button>
            {profile?.cv_filename && <p className="text-xs text-muted-foreground">CV : {profile.cv_filename}</p>}
            {profile?.cover_letter_filename && <p className="text-xs text-muted-foreground">Lettre : {profile.cover_letter_filename}</p>}
          </div>

          {tips.length > 0 && (
            <div className="mt-6 space-y-2 rounded-2xl bg-white/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conseils IA</p>
              {tips.map((t, i) => (
                <p key={i} className="text-sm">• {t}</p>
              ))}
            </div>
          )}
        </Card>

        <Card variant="bento" className="p-6 lg:col-span-2">
          <Tabs defaultValue="identity">
            <TabsList className="rounded-xl">
              <TabsTrigger value="identity">Identité</TabsTrigger>
              <TabsTrigger value="skills">Compétences</TabsTrigger>
              <TabsTrigger value="experience">Parcours</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-4 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["full_name", "Nom complet"],
                  ["headline", "Titre professionnel"],
                  ["email", "Email"],
                  ["phone", "Téléphone"],
                  ["location", "Localisation"],
                  ["years_experience", "Années d'expérience"],
                ].map(([key, lab]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{lab}</Label>
                    <Input value={value(key)} onChange={(e) => setDraft((d) => ({ ...d, [key]: key === "years_experience" ? Number(e.target.value) : e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Résumé professionnel</Label>
                <Textarea rows={6} value={value("summary")} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} />
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-4 pt-5">
              <div className="flex gap-2">
                <Input placeholder="Ajouter une compétence" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
                <Button
                  variant="accent"
                  onClick={() => {
                    if (!newSkill.trim()) return;
                    setDraft((d) => ({ ...d, skills: [...skills, { name: newSkill.trim(), level: "intermédiaire" }] }));
                    setNewSkill("");
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <Badge key={i} variant="nxj-glass" className="gap-1.5 py-1">
                    {label(s)}
                    <button onClick={() => setDraft((d) => ({ ...d, skills: skills.filter((_, j) => j !== i) }))}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {skills.length === 0 && <p className="text-sm text-muted-foreground">Importez votre CV pour extraire vos compétences.</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Langues</Label>
                <div className="flex flex-wrap gap-2">
                  {(profile?.languages ?? []).map((l: any, i: number) => (
                    <Badge key={i} variant="soft">{label(l)} {l?.level ? `· ${l.level}` : ""}</Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="experience" className="space-y-4 pt-5">
              {(profile?.experiences ?? []).map((exp: any, i: number) => (
                <div key={i} className="rounded-2xl bg-white/45 p-4">
                  <p className="font-medium">{exp.title} — {exp.company}</p>
                  <p className="text-xs text-muted-foreground">{exp.start} → {exp.end} {exp.location ? `· ${exp.location}` : ""}</p>
                  {exp.description && <p className="mt-2 text-sm">{exp.description}</p>}
                </div>
              ))}
              {(profile?.educations ?? []).map((ed: any, i: number) => (
                <div key={`ed-${i}`} className="rounded-2xl bg-white/30 p-4">
                  <p className="font-medium">{ed.degree}</p>
                  <p className="text-xs text-muted-foreground">{ed.school} {ed.year ? `· ${ed.year}` : ""}</p>
                </div>
              ))}
              {!(profile?.experiences ?? []).length && (
                <p className="text-sm text-muted-foreground">Aucune expérience enregistrée. Importez votre CV.</p>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </PageContainer>
  );
}
