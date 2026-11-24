/** Détecteur de tendances live : crawl RSS + Google Trends (server-only). */

const FEEDS: { source: string; url: string }[] = [
  { source: "Google Trends FR", url: "https://trends.google.com/trending/rss?geo=FR" },
  { source: "Google News Business", url: "https://news.google.com/rss/search?q=business+innovation&hl=fr&gl=FR&ceid=FR:fr" },
  { source: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { source: "HBR", url: "https://feeds.hbr.org/harvardbusiness" },
  { source: "Google News IA", url: "https://news.google.com/rss/search?q=intelligence+artificielle&hl=fr&gl=FR&ceid=FR:fr" },
];

const STOP = new Set(["pour", "avec", "dans", "cette", "leur", "plus", "tout", "sont", "être", "vous", "nous", "the", "and", "for", "with", "that", "this", "from"]);

function tag(name: string, xml: string): string[] {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "gi");
  const out: string[] = [];
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

function clean(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordsOf(text: string) {
  const words = text.toLowerCase().match(/[a-zà-ÿ]{4,}/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (STOP.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
}

export async function crawlTrends(supabase: any) {
  let inserted = 0;
  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; KemeyBot/1.0)" } });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = tag("item", xml).slice(0, 12);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const title = clean(tag("title", it)[0] ?? "");
        const url = clean(tag("link", it)[0] ?? "") || null;
        const summary = clean(tag("description", it)[0] ?? "").slice(0, 500);
        const pub = clean(tag("pubDate", it)[0] ?? "");
        if (!title) continue;
        const recency = pub ? Math.max(0, 40 - Math.floor((Date.now() - new Date(pub).getTime()) / 3600000)) : 20;
        const score = Math.min(100, 60 - i * 3 + recency);
        await supabase.from("cml_trends").upsert(
          {
            source: feed.source,
            title: title.slice(0, 300),
            url,
            summary,
            keywords: keywordsOf(`${title} ${summary}`),
            score,
            published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
          },
          { onConflict: "url", ignoreDuplicates: false },
        );
        inserted++;
      }
    } catch {
      /* un flux indisponible ne bloque pas le crawl */
    }
  }
  // purge > 7 jours
  await supabase.from("cml_trends").delete().lt("created_at", new Date(Date.now() - 7 * 864e5).toISOString());
  return { inserted };
}
