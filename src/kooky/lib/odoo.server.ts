/**
 * Odoo JSON-RPC client (works with Odoo Online & self-hosted, API key auth).
 * Uses the native external API: common.authenticate + object.execute_kw.
 */
export type OdooCreds = { url: string; db: string; login: string; apiKey: string };

export function normalizeOdooUrl(input: string) {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/+$/, "");
}

async function rpc<T>(url: string, service: string, method: string, args: unknown[]): Promise<T> {
  const res = await fetch(`${url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: Date.now(), params: { service, method, args } }),
  });
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status} — vérifiez l'URL (${url}).`);
  const json = (await res.json()) as {
    result?: T;
    error?: { message?: string; data?: { message?: string; name?: string } };
  };
  if (json.error) {
    const msg = json.error.data?.message || json.error.message || "Erreur Odoo";
    throw new Error((msg.split("\n")[0] ?? msg).slice(0, 300));
  }
  return json.result as T;
}

export class OdooClient {
  private uid: number | null = null;
  constructor(private creds: OdooCreds) {
    this.creds.url = normalizeOdooUrl(creds.url);
  }

  async version(): Promise<string> {
    const v = await rpc<{ server_version?: string }>(this.creds.url, "common", "version", []);
    return v?.server_version ?? "inconnue";
  }

  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;
    const uid = await rpc<number | false>(this.creds.url, "common", "authenticate", [
      this.creds.db,
      this.creds.login,
      this.creds.apiKey,
      {},
    ]);
    if (!uid) throw new Error("Authentification refusée : vérifiez la base, l'email et la clé API.");
    this.uid = uid;
    return uid;
  }

  async call<T>(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<T> {
    const uid = await this.authenticate();
    return rpc<T>(this.creds.url, "object", "execute_kw", [
      this.creds.db,
      uid,
      this.creds.apiKey,
      model,
      method,
      args,
      kwargs,
    ]);
  }

  /** Native access checks on the CRM & Contacts modules (equivalent of "scopes"). */
  async checkAccess() {
    const models = ["crm.lead", "res.partner", "crm.tag", "mail.message"];
    const ops = ["read", "create", "write"] as const;
    const rights: Record<string, Record<string, boolean>> = {};
    for (const m of models) {
      rights[m] = {};
      for (const op of ops) {
        try {
          rights[m][op] = await this.call<boolean>(m, "check_access_rights", [op], { raise_exception: false });
        } catch {
          rights[m][op] = false;
        }
      }
    }
    let crmInstalled = false;
    try {
      crmInstalled =
        (await this.call<number>("ir.module.module", "search_count", [
          [
            ["name", "=", "crm"],
            ["state", "=", "installed"],
          ],
        ])) > 0;
    } catch {
      crmInstalled = rights["crm.lead"]?.["read"] ?? false;
    }
    return { rights, crmInstalled };
  }

  async findCountryId(country: string | null | undefined): Promise<number | false> {
    if (!country) return false;
    const c = country.trim();
    const byCode =
      c.length === 2
        ? await this.call<number[]>("res.country", "search", [[["code", "=", c.toUpperCase()]]], { limit: 1 })
        : [];
    if (byCode[0] !== undefined) return byCode[0];
    const byName = await this.call<number[]>("res.country", "search", [[["name", "ilike", c]]], { limit: 1 });
    return byName[0] ?? false;
  }

  async ensureTag(name: string): Promise<number | null> {
    try {
      const found = await this.call<number[]>("crm.tag", "search", [[["name", "=", name]]], { limit: 1 });
      if (found[0] !== undefined) return found[0];
      return await this.call<number>("crm.tag", "create", [{ name }]);
    } catch {
      return null;
    }
  }
}
