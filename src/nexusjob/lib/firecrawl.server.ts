const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

export type HumanScrollConfig = {
  scrollDelayMs: number;
  scrollJitterMs: number;
  scrollSteps: number;
  waitForMs: number;
  requestDelayMs: number;
};

export type FirecrawlAction =
  | { type: "wait"; milliseconds: number }
  | { type: "scroll"; direction: "down" | "up" };

/**
 * Génère une séquence d'actions imitant un lecteur humain :
 * attente initiale, puis scrolls espacés par des délais aléatoires (jitter).
 * Objectif : rester respectueux des sites et éviter tout blocage.
 */
export function buildHumanActions(config: HumanScrollConfig): FirecrawlAction[] {
  const actions: FirecrawlAction[] = [
    { type: "wait", milliseconds: clamp(config.waitForMs, 500, 15000) },
  ];
  const steps = clamp(config.scrollSteps, 0, 12);
  for (let i = 0; i < steps; i++) {
    const jitter = Math.round((Math.random() * 2 - 1) * config.scrollJitterMs);
    actions.push({ type: "scroll", direction: "down" });
    actions.push({
      type: "wait",
      milliseconds: clamp(config.scrollDelayMs + jitter, 400, 20000),
    });
  }
  return actions;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function humanDelay(config: HumanScrollConfig) {
  const jitter = Math.round(Math.random() * config.scrollJitterMs);
  return sleep(clamp(config.requestDelayMs + jitter, 0, 30000));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function firecrawlFetch<T>(apiKey: string, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${FIRECRAWL_V2}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 402) {
      throw new Error("Crédits Firecrawl insuffisants sur votre compte.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Clé API Firecrawl invalide ou expirée.");
    }
    throw new Error(`Firecrawl [${response.status}] : ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as T;
}

export type FirecrawlSearchResult = {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
};

/** Réglages avancés natifs de Firecrawl, pilotables par l'utilisateur ou par l'IA. */
export type FirecrawlAdvanced = {
  timeout?: number;
  maxAge?: number;
  mobile?: boolean;
  blockAds?: boolean;
  skipTlsVerification?: boolean;
  removeBase64Images?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
};

function applyAdvanced(payload: Record<string, unknown>, adv: FirecrawlAdvanced = {}) {
  if (adv.timeout) payload.timeout = clamp(adv.timeout, 5000, 120000);
  if (adv.maxAge && adv.maxAge > 0) payload.maxAge = clamp(adv.maxAge, 0, 604800000);
  if (adv.mobile) payload.mobile = true;
  if (adv.blockAds !== undefined) payload.blockAds = adv.blockAds;
  if (adv.skipTlsVerification) payload.skipTlsVerification = true;
  if (adv.removeBase64Images !== undefined) payload.removeBase64Images = adv.removeBase64Images;
  if (adv.includeTags?.length) payload.includeTags = adv.includeTags;
  if (adv.excludeTags?.length) payload.excludeTags = adv.excludeTags;
  return payload;
}

export async function firecrawlSearch(
  apiKey: string,
  query: string,
  options: {
    limit?: number;
    country?: string;
    languages?: string[];
    tbs?: string;
    scrape?: boolean;
    onlyMainContent?: boolean;
    formats?: string[];
    advanced?: FirecrawlAdvanced;
  } = {},
): Promise<FirecrawlSearchResult[]> {
  const payload: Record<string, unknown> = {
    query,
    limit: clamp(options.limit ?? 6, 1, 20),
    country: (options.country ?? "FR").toLowerCase(),
    lang: options.languages?.[0] ?? "fr",
  };
  if (options.tbs) payload.tbs = options.tbs;
  if (options.scrape) {
    payload.scrapeOptions = applyAdvanced(
      {
        formats: options.formats?.length ? options.formats : ["markdown"],
        onlyMainContent: options.onlyMainContent ?? true,
      },
      options.advanced,
    );
  }
  const data = await firecrawlFetch<{ data?: unknown; web?: unknown }>(
    apiKey,
    "/search",
    payload,
  );
  const raw = (data.data ?? data.web ?? []) as unknown;
  const list = Array.isArray(raw)
    ? raw
    : ((raw as { web?: FirecrawlSearchResult[] })?.web ?? []);
  return (list as FirecrawlSearchResult[]).filter((item) => Boolean(item?.url));
}

export async function firecrawlScrape(
  apiKey: string,
  url: string,
  options: {
    formats?: string[];
    onlyMainContent?: boolean;
    waitFor?: number;
    actions?: FirecrawlAction[];
    country?: string;
    languages?: string[];
    proxy?: string;
    advanced?: FirecrawlAdvanced;
  } = {},
): Promise<{ markdown?: string; summary?: string; links?: string[]; metadata?: Record<string, unknown> }> {
  const payload: Record<string, unknown> = {
    url,
    formats: options.formats ?? ["markdown"],
    onlyMainContent: options.onlyMainContent ?? true,
  };
  if (options.waitFor) payload.waitFor = clamp(options.waitFor, 0, 30000);
  if (options.actions?.length) payload.actions = options.actions;
  if (options.country) {
    payload.location = { country: options.country, languages: options.languages ?? ["fr"] };
  }
  if (options.proxy && options.proxy !== "auto") payload.proxy = options.proxy;
  applyAdvanced(payload, options.advanced);

  const data = await firecrawlFetch<Record<string, unknown>>(apiKey, "/scrape", payload);
  const doc = (data.data ?? data) as Record<string, unknown>;
  return {
    markdown: doc.markdown as string | undefined,
    summary: doc.summary as string | undefined,
    links: doc.links as string[] | undefined,
    metadata: doc.metadata as Record<string, unknown> | undefined,
  };
}

export async function firecrawlMap(
  apiKey: string,
  url: string,
  options: { search?: string; limit?: number; includeSubdomains?: boolean } = {},
): Promise<string[]> {
  const data = await firecrawlFetch<{ links?: unknown }>(apiKey, "/map", {
    url,
    search: options.search,
    limit: clamp(options.limit ?? 30, 1, 500),
    includeSubdomains: options.includeSubdomains ?? false,
  });
  const links = data.links ?? [];
  if (!Array.isArray(links)) return [];
  return links.map((l) => (typeof l === "string" ? l : ((l as { url?: string }).url ?? ""))).filter(Boolean);
}

export async function firecrawlVerify(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const results = await firecrawlSearch(apiKey, "test connexion firecrawl", { limit: 1 });
    return {
      ok: true,
      message: `Connexion Firecrawl établie (${results.length} résultat de test).`,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Échec inconnu." };
  }
}
