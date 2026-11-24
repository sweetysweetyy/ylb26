import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, MapPin, Banknote, ExternalLink, Star, Sparkles, Loader2 } from "lucide-react";
import { useSession } from "@/nexusjob/hooks/use-session";
import { useOffers } from "@/nexusjob/hooks/use-app-data";
import { generateApplicationKit } from "@/nexusjob/lib/search.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/nexusjob/components/page-header";
import { Card } from "@/nexusjob/components/ui/card";
import { Button } from "@/nexusjob/components/ui/button";
import { Badge } from "@/nexusjob/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScoreRing } from "@/nexusjob/components/score-ring";
import { OFFER_STATUSES } from "@/nexusjob/lib/sources";

export const Route = createFileRoute("/_authenticated/nexusjob/offers")({
  head: () => ({
    meta: [
      { title: "Mes offres — NexusJob" },
      { name: "description", content: "Toutes vos offres analysées avec score de compatibilité, compétences manquantes et conseils." },
      { property: "og:title", content: "Mes offres — NexusJob" },
      { property: "og:description", content: "Offres notées par l'IA avec fiche complète et kit de candidature." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OffersPage,
});

const list = (v: any): string[] => (Array.isArray(v) ? v : []);

const BREAKDOWN_LABELS: [string, string, number][] = [
  ["skills", "Compétences", 40],
  ["experience", "Expérience", 25],
  ["location", "Localisation", 15],
  ["contract", "Contrat & séniorité", 10],
  ["motivation", "Motivation & secteur", 10],
];

const breakdown = (o: any): Record<string, number> =>
  o?.score_breakdown && typeof o.score_breakdown === "object" ? o.score_breakdown : {};

function OffersPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: offers = [], isLoading } = useOffers(user?.id);
  const kit = useServerFn(generateApplicationKit);
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [letter, setLetter] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      offers.filter(
        (o) =>
          Number(o.score) >= minScore &&
          `${o.title} ${o.company} ${o.location} ${o.source}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [offers, query, minScore],
  );

  const update = async (id: string, patch: Record<string, unknown>) => {
    await supabase.from("nxj_offers").update(patch as never).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["offers", user?.id] });
  };

  const buildKit = async (id: string) => {
    setBusy(id);
    try {
      const result = await kit({ data: { offerId: id } });
      setLetter((l) => ({ ...l, [id]: result.coverLetter }));
      toast.success("Lettre de motivation générée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Mes offres" subtitle={`${offers.length} offre(s) analysée(s) par l'IA.`} />

      <Card variant="bento" className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input className="max-w-xs" placeholder="Rechercher un poste, une entreprise…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex items-center gap-2">
          {[0, 50, 70, 85].map((s) => (
            <button key={s} onClick={() => setMinScore(s)}>
              <Badge variant={minScore === s ? "holo" : "nxj-glass"} className="py-1">{s === 0 ? "Tous" : `≥ ${s}%`}</Badge>
            </button>
          ))}
        </div>
      </Card>

      {isLoading && <Loader2 className="mx-auto size-6 animate-spin text-nxj-holo-2" />}

      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((o, i) => {
          const open = openId === o.id;
          return (
            <motion.div key={o.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
              <Card variant="bento" className="p-6">
                <div className="flex items-start gap-4">
                  <ScoreRing score={Number(o.score)} size={70} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold leading-snug">{o.title}</h3>
                      <button onClick={() => update(o.id, { favorite: !o.favorite })}>
                        <Star className={`size-4 ${o.favorite ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {o.company && <span className="flex items-center gap-1"><Building2 className="size-3" /> {o.company}</span>}
                      {o.location && <span className="flex items-center gap-1"><MapPin className="size-3" /> {o.location}</span>}
                      {o.salary && <span className="flex items-center gap-1"><Banknote className="size-3" /> {o.salary}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="soft">{o.source}</Badge>
                      {o.contract_type && <Badge variant="nxj-glass">{o.contract_type}</Badge>}
                      {o.remote && o.remote !== "unknown" && <Badge variant="nxj-glass">{o.remote}</Badge>}
                      {o.seniority && <Badge variant="nxj-glass">{o.seniority}</Badge>}
                      {(o as any).sector && <Badge variant="nxj-glass">{(o as any).sector}</Badge>}
                      {(o as any).match_type && (
                        <Badge variant={(o as any).match_type === "exact" ? "live" : "accent"}>
                          {(o as any).match_type === "exact" ? "Correspondance exacte" : (o as any).match_type === "proche" ? "Métier proche" : "Même secteur"}
                        </Badge>
                      )}
                      {(o as any).region_match === "in_region" && <Badge variant="live">Dans la région</Badge>}
                    </div>
                  </div>
                </div>

                {o.summary && <p className="mt-4 text-sm text-foreground/80">{o.summary}</p>}

                {Object.keys(breakdown(o)).length > 0 && (
                  <div className="mt-4 space-y-2 rounded-2xl bg-white/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Détail du score
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BREAKDOWN_LABELS.filter(([k]) => breakdown(o)[k] !== undefined).map(([k, lab, max]) => {
                        const v = Number(breakdown(o)[k]) || 0;
                        return (
                          <div key={k} className="space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>{lab}</span>
                              <span className="font-semibold text-foreground">{v}/{max}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/60">
                              <div className="h-full rounded-full bg-gradient-to-r from-nxj-holo-1 to-nxj-holo-3" style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {o.reasoning && <p className="text-xs text-foreground/80">{o.reasoning}</p>}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Compétences validées</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {list(o.matching_skills).slice(0, 8).map((s, j) => <Badge key={j} variant="live" className="py-0.5">{s}</Badge>)}
                      {!list(o.matching_skills).length && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Compétences manquantes</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {list(o.missing_skills).slice(0, 8).map((s, j) => <Badge key={j} variant="accent" className="py-0.5">{s}</Badge>)}
                      {!list(o.missing_skills).length && <span className="text-xs text-muted-foreground">Aucune 🎉</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mots-clés communs</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {list((o as any).keyword_matches).slice(0, 10).map((s, j) => <Badge key={j} variant="nxj-glass" className="py-0.5">{s}</Badge>)}
                      {!list((o as any).keyword_matches).length && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Écarts détectés</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {list((o as any).keyword_gaps).slice(0, 10).map((s, j) => <Badge key={j} variant="soft" className="py-0.5">{s}</Badge>)}
                      {!list((o as any).keyword_gaps).length && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </div>
                </div>


                {open && (
                  <div className="mt-4 space-y-4 rounded-2xl bg-white/45 p-4 text-sm">
                    {o.reasoning && <p><span className="font-semibold">Analyse : </span>{o.reasoning}</p>}
                    {list(o.strengths).length > 0 && (
                      <div><p className="font-semibold">Points forts</p>{list(o.strengths).map((s, j) => <p key={j}>• {s}</p>)}</div>
                    )}
                    {list(o.risks).length > 0 && (
                      <div><p className="font-semibold">Points de vigilance</p>{list(o.risks).map((s, j) => <p key={j}>• {s}</p>)}</div>
                    )}
                    {list(o.interview_tips).length > 0 && (
                      <div><p className="font-semibold">Préparer l'entretien</p>{list(o.interview_tips).map((s, j) => <p key={j}>• {s}</p>)}</div>
                    )}
                    {o.cover_letter_hook && <p className="italic">« {o.cover_letter_hook} »</p>}
                    {letter[o.id] && (
                      <div className="whitespace-pre-wrap rounded-xl bg-white/70 p-3 text-xs">{letter[o.id]}</div>
                    )}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Button asChild variant="holo" size="sm">
                    <a href={o.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Postuler</a>
                  </Button>
                  <Button variant="nxj-glass" size="sm" onClick={() => setOpenId(open ? null : o.id)}>
                    {open ? "Réduire" : "Fiche complète"}
                  </Button>
                  <Button variant="nxj-glass" size="sm" onClick={() => buildKit(o.id)} disabled={busy === o.id}>
                    {busy === o.id ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Lettre IA
                  </Button>
                  <select
                    className="ml-auto rounded-xl border border-white/60 bg-white/60 px-2.5 py-1.5 text-xs"
                    value={o.status}
                    onChange={(e) => update(o.id, { status: e.target.value })}
                  >
                    {OFFER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {!isLoading && !filtered.length && (
        <Card variant="bento" className="p-12 text-center text-sm text-muted-foreground">
          Aucune offre. Lancez une recherche depuis l'onglet Recherche.
        </Card>
      )}
    </PageContainer>
  );
}
