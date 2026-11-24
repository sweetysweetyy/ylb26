// Client Odoo JSON-RPC minimal (fetch natif, aucune dépendance) + chiffrement des clés API.
import type { OdooScope } from "./invoice-types";

/* Shared Laboratory odoo_connections stores the API key server-side readable; no app-level encryption. */
export async function encryptSecret(plain: string): Promise<string> { return plain; }
export async function decryptSecret(stored: string): Promise<string> { return stored; }

/* ---------- JSON-RPC ---------- */

export interface OdooCreds {
  url: string;
  db: string;
  username: string;
  apiKey: string;
}

export function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/+$/, "");
}

async function rpc<T>(url: string, service: string, method: string, args: unknown[]): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${url}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: Date.now(), params: { service, method, args } }),
    });
  } catch {
    throw new Error("Impossible de joindre le serveur Odoo. Vérifiez l'URL.");
  }
  if (!res.ok) throw new Error(`Odoo a répondu avec le statut ${res.status}.`);
  const json = (await res.json()) as { result?: T; error?: { message?: string; data?: { message?: string; name?: string } } };
  if (json.error) {
    const msg = json.error.data?.message || json.error.message || "Erreur Odoo";
    throw new Error(msg.split("\n").filter(Boolean).slice(-1)[0] ?? msg);
  }
  return json.result as T;
}

export class OdooClient {
  uid = 0;
  constructor(private creds: OdooCreds) {}

  async login(): Promise<number> {
    const uid = await rpc<number | false>(this.creds.url, "common", "login", [this.creds.db, this.creds.username, this.creds.apiKey]);
    if (!uid) throw new Error("Authentification refusée : base, identifiant ou clé API incorrects.");
    this.uid = uid;
    return uid;
  }

  version(): Promise<{ server_version?: string }> {
    return rpc(this.creds.url, "common", "version", []);
  }

  call<T>(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<T> {
    return rpc<T>(this.creds.url, "object", "execute_kw", [this.creds.db, this.uid, this.creds.apiKey, model, method, args, kwargs]);
  }

  searchRead<T>(model: string, domain: unknown[], fields: string[], limit = 10, order?: string): Promise<T[]> {
    return this.call<T[]>(model, "search_read", [domain], { fields, limit, ...(order ? { order } : {}) });
  }

  create(model: string, values: Record<string, unknown>): Promise<number> {
    return this.call<number>(model, "create", [values]);
  }
}

/* ---------- Scopes natifs Odoo requis ---------- */

const REQUIRED_SCOPES: Omit<OdooScope, "ok" | "detail">[] = [
  { key: "contacts", label: "Contacts — fournisseurs", model: "res.partner", rights: ["read", "create", "write"] },
  { key: "account", label: "Facturation — factures fournisseurs", model: "account.move", rights: ["read", "create", "write"] },
  { key: "account_line", label: "Facturation — lignes de facture", model: "account.move.line", rights: ["read", "create"] },
  { key: "purchase", label: "Achats — bons de commande", model: "purchase.order", rights: ["read", "create", "write"] },
  { key: "purchase_line", label: "Achats — lignes de commande", model: "purchase.order.line", rights: ["read", "create"] },
  { key: "product", label: "Produits", model: "product.product", rights: ["read", "create"] },
  { key: "tax", label: "Taxes", model: "account.tax", rights: ["read"] },
  { key: "currency", label: "Devises", model: "res.currency", rights: ["read"] },
  { key: "country", label: "Pays", model: "res.country", rights: ["read"] },
  { key: "attachment", label: "Pièces jointes (PDF)", model: "ir.attachment", rights: ["read", "create"] },
];

export async function checkScopes(client: OdooClient): Promise<OdooScope[]> {
  const out: OdooScope[] = [];
  for (const s of REQUIRED_SCOPES) {
    let ok = true;
    let detail: string | undefined;
    for (const right of s.rights) {
      try {
        const granted = await client.call<boolean>(s.model, "check_access_rights", [right], { raise_exception: false });
        if (!granted) {
          ok = false;
          detail = `Droit "${right}" manquant`;
          break;
        }
      } catch (e) {
        ok = false;
        detail = (e as Error).message.includes("doesn't exist") || (e as Error).message.includes("Object")
          ? "Module non installé"
          : (e as Error).message;
        break;
      }
    }
    out.push({ ...s, ok, ...(detail ? { detail } : {}) });
  }
  return out;
}
