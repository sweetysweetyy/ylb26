import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Radar, FileUp, Target, TrendingUp, Sparkles, Building2 } from "lucide-react";
import { useSession } from "@/nexusjob/hooks/use-session";
import { useOffers, useProfile, useSearches, useSettings } from "@/nexusjob/hooks/use-app-data";
import { PageContainer, PageHeader } from "@/nexusjob/components/page-header";
import { Card } from "@/nexusjob/components/ui/card";
import { Badge } from "@/nexusjob/components/ui/badge";
import { Button } from "@/nexusjob/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/nexusjob/components/score-ring";

export const Route = createFileRoute("/_authenticated/nexusjob/dashboard")({
  head: () => ({
    meta: [
      { title: "Cockpit — NexusJob" },
      { name: "description", content: "Vue d'ensemble de votre profil, de vos recherches et de vos meilleures offres." },
      { property: "og:title", content: "Cockpit — NexusJob" },
      { property: "og:description", content: "Pilotez votre recherche d'emploi augmentée par l'IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: settings } = useSettings(user?.id);
  const { data: offers = [] } = useOffers(user?.id);
  const { data: searches = [] } = useSearches(user?.id);

  const completion = Number(profile?.completion ?? 0);
  const top = offers.slice(0, 4);
  const avg = offers.length ? Math.round(offers.reduce((a, o) => a + Number(o.score), 0) / offers.length) : 0;
  const excellent = offers.filter((o) => Number(o.score) >= 80).length;

  const stats = [
    { label: "Offres analysées", value: offers.length, icon: Target },
    { label: "Score moyen", value: `${avg}%`, icon: TrendingUp },
    { label: "Très compatibles", value: excellent, icon: Sparkles },
    { label: "Recherches lancées", value: searches.length, icon: Radar },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={`Bonjour ${String(profile?.full_name ?? "").split(" ")[0] || ""} 👋`}
        subtitle="Votre cockpit de recherche d'emploi augmenté par l'intelligence artificielle."
        action={
          <Button asChild variant="holo" size="lg">
            <Link to="/nexusjob/search">
              <Radar className="size-4" /> Lancer une recherche
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card variant="bento" className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</span>
                <s.icon className="size-4 text-accent" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card variant="holo" className="p-6 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold">Complétion du profil</h2>
          <div className="mt-5 flex items-center gap-5">
            <ScoreRing score={completion} size={86} label="profil" />
            <div className="flex-1 space-y-2 text-sm">
              <Progress value={completion} className="h-2" />
              <p className="text-muted-foreground">
                {completion >= 80
                  ? "Profil solide, vos scores seront très fiables."
                  : "Importez votre CV pour améliorer la précision du matching."}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="nxj-glass" size="sm"><Link to="/nexusjob/profile"><FileUp className="size-4" /> Importer un CV</Link></Button>
            {!settings?.firecrawl_api_key && (
              <Button asChild variant="accent" size="sm"><Link to="/nexusjob/settings">Connecter Firecrawl</Link></Button>
            )}
          </div>
        </Card>

        <Card variant="bento" className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Meilleures offres</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/nexusjob/offers">Tout voir</Link></Button>
          </div>
          {top.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune offre pour l'instant. Lancez votre première recherche.
            </p>
          ) : (
            <div className="space-y-3">
              {top.map((o) => (
                <div key={o.id} className="flex items-center gap-4 rounded-2xl bg-white/40 p-3">
                  <ScoreRing score={Number(o.score)} size={54} label="" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{o.title}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Building2 className="size-3" /> {o.company ?? "—"} · {o.location ?? "—"}
                    </p>
                  </div>
                  <Badge variant="soft">{o.source}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
