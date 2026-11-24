// Page Weaver: minimal Odoo JSON-RPC client to publish a page as the website homepage.
type Creds = { url: string; db: string; login: string; apiKey: string };

async function rpc(url: string, service: string, method: string, args: unknown[]) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: Date.now() }),
  });
  if (!res.ok) throw new Error(`Odoo a répondu ${res.status}. Vérifiez l'adresse du site.`);
  const json = (await res.json()) as { result?: unknown; error?: { message?: string; data?: { message?: string } } };
  if (json.error) throw new Error(json.error.data?.message || json.error.message || "Erreur Odoo");
  return json.result;
}

/** Converts an HTML document into XML-safe markup usable inside a QWeb view. */
export function toQwebMarkup(html: string) {
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const body = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  const bodyClass = body?.[1].match(/class="([^"]*)"/)?.[1] ?? "";
  const keepHead = (head.match(/<(link|script|style)\b[\s\S]*?(<\/\1>|\/?>)/gi) ?? []).join("\n");
  let out = `${keepHead}\n<div class="${bodyClass}">${body?.[2] ?? html}</div>`;
  const blocks: string[] = [];
  out = out.replace(/<(script|style)([^>]*)>([\s\S]*?)<\/\1>/gi, (_m, tag, attrs, inner) => {
    blocks.push(`<${tag}${attrs}>${inner.trim() ? `<![CDATA[${inner.replace(/]]>/g, "]]]]><![CDATA[>")}]]>` : ""}</${tag}>`);
    return `\u0000${blocks.length - 1}\u0000`;
  });
  out = out
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replace(/&nbsp;/g, "&#160;")
    .replace(/<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b([^>]*?)\/?>/gi, "<$1$2/>");
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i) => blocks[Number(i)]!);
  return out;
}

export async function publishHomepage(c: Creds, page: { title: string; html: string }) {
  const uid = (await rpc(c.url, "common", "login", [c.db, c.login, c.apiKey])) as number | false;
  if (!uid) throw new Error("Identifiants Odoo refusés (base, identifiant ou clé API).");
  const call = <T,>(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) =>
    rpc(c.url, "object", "execute_kw", [c.db, uid, c.apiKey, model, method, args, kwargs]) as Promise<T>;

  const mods = await call<Array<{ state: string }>>("ir.module.module", "search_read", [[["name", "=", "website"]]], { fields: ["state"] });
  if (mods[0]?.state !== "installed") throw new Error("Le module Site Web n'est pas installé sur votre Odoo.");

  const key = "website.pageweaver_homepage";
  const title = page.title.replace(/[&<>"]/g, "");
  const arch = `<t name="${title}" t-name="${key}"><t t-call="website.layout"><div id="wrap" class="oe_structure">${toQwebMarkup(page.html)}</div></t></t>`;

  const views = await call<number[]>("ir.ui.view", "search", [[["key", "=", key]]]);
  let viewId = views[0];
  if (viewId) await call("ir.ui.view", "write", [[viewId], { arch_db: arch, name: title }]);
  else viewId = await call<number>("ir.ui.view", "create", [{ name: title, type: "qweb", key, arch_db: arch }]);

  // Odoo serves the website.page with URL "/" as the homepage.
  const pages = await call<number[]>("website.page", "search", [[["url", "=", "/"]]]);
  for (const id of pages) await call("website.page", "write", [[id], { url: `/ancienne-accueil-${id}`, is_published: false }]).catch(() => null);
  const existing = await call<number[]>("website.page", "search", [[["view_id", "=", viewId]]]);
  if (existing[0]) await call("website.page", "write", [[existing[0]], { url: "/", is_published: true, name: title }]);
  else await call("website.page", "create", [{ name: title, url: "/", view_id: viewId, is_published: true, website_indexed: true }]);

  // Older Odoo versions use a homepage_url setting on the website.
  await call<number[]>("website", "search", [[]]).then((ids) => call("website", "write", [ids, { homepage_url: "/" }])).catch(() => null);

  return { url: `${c.url.replace(/\/+$/, "")}/` };
}
