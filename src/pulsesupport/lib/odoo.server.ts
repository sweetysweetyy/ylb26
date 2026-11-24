// Minimal Odoo JSON-RPC client (no dependency). Uses the user's login + API key.
export type OdooCreds = { url: string; db: string; login: string; apiKey: string };

async function rpc(url: string, service: string, method: string, args: unknown[]) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: Date.now() }),
  });
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}`);
  const body = (await res.json()) as { result?: unknown; error?: { data?: { message?: string }; message?: string } };
  if (body.error) throw new Error(body.error.data?.message ?? body.error.message ?? "Odoo error");
  return body.result;
}

export function odooClient(c: OdooCreds) {
  let uid: number | undefined;
  async function login() {
    if (uid) return uid;
    const r = await rpc(c.url, "common", "authenticate", [c.db, c.login, c.apiKey, {}]);
    if (!r) throw new Error("Identifiants Odoo invalides");
    uid = r as number;
    return uid;
  }
  async function call<T = unknown>(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
    const id = await login();
    return (await rpc(c.url, "object", "execute_kw", [c.db, id, c.apiKey, model, method, args, kwargs])) as T;
  }
  return { login, call };
}

/** Native Odoo access rights required by the support features. */
export const REQUIRED_SCOPES = [
  { model: "res.partner", rights: "Lecture", module: "Contacts", why: "Retrouver le client (nom, prénom, téléphone)" },
  { model: "helpdesk.ticket", rights: "Lecture, Création", module: "Assistance (Helpdesk)", why: "Vérifier ou créer un ticket SAV" },
  { model: "helpdesk.stage", rights: "Lecture", module: "Assistance (Helpdesk)", why: "Donner l'état du ticket" },
  { model: "sale.order", rights: "Lecture", module: "Ventes", why: "Contexte des commandes du client" },
  { model: "calendar.event", rights: "Création", module: "Calendrier", why: "Planifier un rappel avec un conseiller" },
] as const;
