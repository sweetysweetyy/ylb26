/** Optimiseur d'horaires : analyse l'engagement réel par créneau. */

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// Référentiel B2B LinkedIn (fallback quand l'historique est trop faible)
const BASELINE: Record<string, number> = {
  "2-8": 88, "2-12": 74, "3-8": 92, "3-12": 76, "4-8": 90, "4-11": 72,
  "1-9": 80, "5-8": 78, "2-17": 66, "3-17": 68, "6-10": 40, "0-10": 34,
};

export async function computeSlots(supabase: any, userId: string) {
  const { data: posts } = await supabase
    .from("cml_posts")
    .select("published_at, analytics")
    .eq("user_id", userId)
    .eq("status", "published")
    .not("published_at", "is", null)
    .limit(300);

  const buckets = new Map<string, { total: number; n: number }>();
  for (const p of posts ?? []) {
    const a: any = p.analytics ?? {};
    const engagement = (a.likes ?? 0) + (a.comments ?? 0) * 3 + (a.shares ?? 0) * 5 + (a.clicks ?? 0) * 0.5;
    const d = new Date(p.published_at);
    const key = `${d.getDay()}-${d.getHours()}`;
    const b = buckets.get(key) ?? { total: 0, n: 0 };
    b.total += engagement;
    b.n += 1;
    buckets.set(key, b);
  }

  const observed = [...buckets.entries()].map(([key, b]) => ({ key, avg: b.total / b.n, n: b.n }));
  const max = Math.max(1, ...observed.map((o) => o.avg));

  const scored = new Map<string, { score: number; samples: number }>();
  for (const [key, base] of Object.entries(BASELINE)) scored.set(key, { score: base * 0.6, samples: 0 });
  for (const o of observed) {
    const prev = scored.get(o.key)?.score ?? 0;
    const confidence = Math.min(1, o.n / 3);
    scored.set(o.key, {
      score: prev * (1 - confidence) + (o.avg / max) * 100 * confidence + prev * 0.2,
      samples: o.n,
    });
  }

  const slots = [...scored.entries()]
    .map(([key, v]) => {
      const [day, hour] = key.split("-").map(Number);
      return {
        day, hour, label: `${DAYS[day]} ${String(hour).padStart(2, "0")}:00`,
        score: Math.round(v.score), samples: v.samples,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  await supabase.from("cml_settings").update({ best_slots: slots }).eq("user_id", userId);
  return { slots, analyzed: posts?.length ?? 0 };
}
