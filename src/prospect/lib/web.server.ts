/** Lightweight web layer: real search + page extraction used by the research pipeline. */

export type WebResult = { title: string; url: string; snippet: string };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function decodeEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

async function timedFetch(url: string, ms = 12000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return response;
  } catch {
    return null;
  }
}

/** Real web search via the DuckDuckGo HTML endpoint (no API key required). */
export async function webSearch(query: string, limit = 8): Promise<WebResult[]> {
  const response = await timedFetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=fr-fr`,
  );
  if (!response || !response.ok) return [];
  const html = await response.text();
  const results: WebResult[] = [];
  const blocks = html.split('class="result results_links');
  for (const block of blocks.slice(1)) {
    const linkMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    let url = decodeEntities(linkMatch[1] ?? "");
    const uddg = url.match(/[?&]uddg=([^&]+)/);
    if (uddg?.[1]) url = decodeURIComponent(uddg[1]);
    if (!url.startsWith("http")) continue;
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    results.push({
      title: stripTags(linkMatch[2] ?? "").slice(0, 200),
      url,
      snippet: stripTags(snippetMatch?.[1] ?? "").slice(0, 400),
    });
    if (results.length >= limit) break;
  }
  return results;
}

export async function multiSearch(queries: string[], perQuery = 6): Promise<WebResult[]> {
  const batches = await Promise.all(queries.slice(0, 8).map((q) => webSearch(q, perQuery)));
  const seen = new Set<string>();
  const merged: WebResult[] = [];
  for (const batch of batches) {
    for (const item of batch) {
      const key = item.url.replace(/\/$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

/** Fetch a page and return readable text plus discovered emails/phones. */
export async function fetchPage(url: string, maxChars = 9000) {
  const response = await timedFetch(url);
  if (!response || !response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html") && !contentType.includes("text")) return null;
  const html = (await response.text()).slice(0, 400_000);
  const emails = Array.from(
    new Set(
      (html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])
        .map((mail) => mail.toLowerCase())
        .filter((mail) => !/\.(png|jpg|jpeg|gif|webp|svg)$/.test(mail)),
    ),
  ).slice(0, 8);
  const phones = Array.from(
    new Set(html.match(/(?:\+?\d[\d .-]{7,}\d)/g)?.map((p) => p.trim()) ?? []),
  ).slice(0, 6);
  const socials = Array.from(
    new Set(
      (html.match(/https?:\/\/(?:www\.)?(linkedin|facebook|instagram|x|twitter)\.com\/[^"'\s<>]+/gi) ??
        []).slice(0, 8),
    ),
  );
  return { url, text: stripTags(html).slice(0, maxChars), emails, phones, socials };
}

/** Crawl a company website: homepage + likely contact/about pages. */
export async function crawlSite(website: string) {
  const base = website.startsWith("http") ? website : `https://${website}`;
  const home = await fetchPage(base);
  if (!home) return null;
  const origin = (() => {
    try {
      return new URL(base).origin;
    } catch {
      return base;
    }
  })();
  const extraPaths = ["/contact", "/nous-contacter", "/a-propos", "/qui-sommes-nous", "/mentions-legales"];
  const extras = await Promise.all(extraPaths.map((path) => fetchPage(`${origin}${path}`, 4000)));
  const pages = [home, ...extras.filter((page): page is NonNullable<typeof page> => page !== null)];
  return {
    origin,
    text: pages.map((page) => `# ${page.url}\n${page.text}`).join("\n\n").slice(0, 22000),
    emails: Array.from(new Set(pages.flatMap((page) => page.emails))).slice(0, 10),
    phones: Array.from(new Set(pages.flatMap((page) => page.phones))).slice(0, 8),
    socials: Array.from(new Set(pages.flatMap((page) => page.socials))).slice(0, 10),
    visited: pages.map((page) => page.url),
  };
}
