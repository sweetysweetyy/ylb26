export type OdooCreds = {
  url: string;
  db: string;
  login: string;
  apiKey: string;
};

function normalize(url: string) {
  return url.trim().replace(/\/+$/, "");
}

async function rpc(url: string, service: string, method: string, args: unknown[]) {
  const res = await fetch(`${normalize(url)}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Math.floor(Math.random() * 1e9),
    }),
  });

  if (!res.ok) {
    throw new Error(`Odoo a répondu ${res.status}. Vérifiez l'adresse du site.`);
  }

  const json = (await res.json()) as {
    result?: unknown;
    error?: { message?: string; data?: { message?: string } };
  };

  if (json.error) {
    throw new Error(json.error.data?.message || json.error.message || "Erreur Odoo");
  }
  return json.result;
}

export async function odooVersion(url: string) {
  const result = (await rpc(url, "common", "version", [])) as {
    server_version?: string;
  };
  return result?.server_version ?? "inconnue";
}

export async function odooLogin(c: OdooCreds) {
  const uid = (await rpc(c.url, "common", "login", [c.db, c.login, c.apiKey])) as number | false;
  if (!uid) {
    throw new Error("Identifiants Odoo refusés (base, identifiant ou clé API).");
  }
  return uid;
}

export async function odooCall<T = unknown>(
  c: OdooCreds,
  uid: number,
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  return (await rpc(c.url, "object", "execute_kw", [
    c.db,
    uid,
    c.apiKey,
    model,
    method,
    args,
    kwargs,
  ])) as T;
}

/** Installe les modules natifs Odoo nécessaires (website, etc.). */
export async function ensureOdooModules(
  c: OdooCreds,
  uid: number,
  modules: string[],
): Promise<{ installed: string[]; missing: string[] }> {
  const records = await odooCall<Array<{ id: number; name: string; state: string }>>(
    c,
    uid,
    "ir.module.module",
    "search_read",
    [[["name", "in", modules]]],
    { fields: ["name", "state"] },
  );

  const toInstall = records.filter((m) => m.state !== "installed").map((m) => m.id);
  if (toInstall.length > 0) {
    await odooCall(c, uid, "ir.module.module", "button_immediate_install", [toInstall]);
  }

  const found = records.map((m) => m.name);
  return {
    installed: found,
    missing: modules.filter((m) => !found.includes(m)),
  };
}

/** Crée (ou remplace) une page dans le module Site Web via les modèles natifs. */
export async function upsertOdooPage(
  c: OdooCreds,
  uid: number,
  page: { title: string; slug: string; html: string },
): Promise<{ pageId: number; url: string }> {
  const url = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
  const key = `website.smart_${url.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;

  const arch = `<t name="${escapeXml(page.title)}" t-name="${key}">
  <t t-call="website.layout">
    <div id="wrap" class="oe_structure">${page.html}</div>
  </t>
</t>`;

  const existingViews = await odooCall<number[]>(c, uid, "ir.ui.view", "search", [[["key", "=", key]]]);

  let viewId: number;
  if (existingViews.length > 0) {
    viewId = existingViews[0]!;
    await odooCall(c, uid, "ir.ui.view", "write", [[viewId], { arch_db: arch, name: page.title }]);
  } else {
    viewId = await odooCall<number>(c, uid, "ir.ui.view", "create", [
      { name: page.title, type: "qweb", key, arch_db: arch, arch_base: arch },
    ]);
  }

  const existingPages = await odooCall<number[]>(c, uid, "website.page", "search", [[["url", "=", url]]]);
  let pageId: number;
  if (existingPages.length > 0) {
    pageId = existingPages[0]!;
    await odooCall(c, uid, "website.page", "write", [
      [pageId],
      { view_id: viewId, is_published: true, name: page.title },
    ]);
  } else {
    pageId = await odooCall<number>(c, uid, "website.page", "create", [
      { name: page.title, url, view_id: viewId, is_published: true, website_indexed: true },
    ]);
  }

  return { pageId, url };
}

/** Téléverse une image générée dans les pièces jointes Odoo et renvoie son URL publique. */
export async function uploadOdooImage(
  c: OdooCreds,
  uid: number,
  name: string,
  base64: string,
): Promise<string> {
  const attachmentId = await odooCall<number>(c, uid, "ir.attachment", "create", [
    { name, datas: base64, mimetype: "image/png", public: true, res_model: "ir.ui.view" },
  ]);
  return `/web/image/${attachmentId}`;
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
