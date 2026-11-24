import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function getKey(supabase: { from: (t: string) => any }, userId: string) {
  const { data } = await supabase
    .from("nxj_settings")
    .select("firecrawl_api_key")
    .eq("user_id", userId)
    .maybeSingle();
  const key = data?.firecrawl_api_key as string | undefined;
  if (!key) throw new Error("Aucune clé API Firecrawl enregistrée. Ajoutez-la dans Paramètres.");
  return key;
}

export const testFirecrawl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { firecrawlVerify } = await import("@/nexusjob/lib/firecrawl.server");
    const key = await getKey(context.supabase, context.userId);
    return firecrawlVerify(key);
  });

export const firecrawlMapTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ url: z.string().url(), search: z.string().optional(), limit: z.number().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { firecrawlMap } = await import("@/nexusjob/lib/firecrawl.server");
    const key = await getKey(context.supabase, context.userId);
    const links = await firecrawlMap(key, data.url, { search: data.search, limit: data.limit ?? 30 });
    return { links };
  });

export const firecrawlScrapeTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ url: z.string().url(), formats: z.array(z.string()).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { firecrawlScrape, buildHumanActions } = await import("@/nexusjob/lib/firecrawl.server");
    const { supabase, userId } = context;
    const key = await getKey(supabase, userId);
    const { data: settings } = await supabase
      .from("nxj_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const result = await firecrawlScrape(key, data.url, {
      formats: data.formats ?? (settings?.scrape_formats as string[]) ?? ["markdown"],
      onlyMainContent: settings?.only_main_content ?? true,
      waitFor: settings?.wait_for_ms ?? 2000,
      country: settings?.country ?? "FR",
      languages: (settings?.languages as string[]) ?? ["fr"],
      proxy: settings?.proxy_mode ?? "auto",
      actions: buildHumanActions({
        scrollDelayMs: settings?.scroll_delay_ms ?? 2500,
        scrollJitterMs: settings?.scroll_jitter_ms ?? 1200,
        scrollSteps: settings?.scroll_steps ?? 4,
        waitForMs: settings?.wait_for_ms ?? 2000,
        requestDelayMs: settings?.request_delay_ms ?? 3000,
      }),
    });

    return {
      markdown: (result.markdown ?? "").slice(0, 20000),
      links: (result.links ?? []).slice(0, 100),
      metadata: JSON.stringify(result.metadata ?? {}),
    };
  });

export const firecrawlSearchTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ query: z.string().min(2), limit: z.number().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { firecrawlSearch } = await import("@/nexusjob/lib/firecrawl.server");
    const key = await getKey(context.supabase, context.userId);
    const results = await firecrawlSearch(key, data.query, { limit: data.limit ?? 6 });
    return {
      results: results.map((r) => ({
        url: r.url,
        title: r.title ?? "",
        description: r.description ?? "",
      })),
    };
  });
