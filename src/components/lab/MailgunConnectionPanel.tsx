import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Check, LoaderCircle, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteMailgunConnection,
  getMailgunConnection,
  saveMailgunConnection,
} from "@/lib/mailgun.functions";

const US_BASE = "https://api.mailgun.net";
const EU_BASE = "https://api.eu.mailgun.net";

export function MailgunConnectionPanel() {
  const load = useServerFn(getMailgunConnection);
  const save = useServerFn(saveMailgunConnection);
  const remove = useServerFn(deleteMailgunConnection);

  const [domain, setDomain] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [signingKey, setSigningKey] = useState("");
  const [region, setRegion] = useState<"us" | "eu" | "custom">("us");
  const [customBase, setCustomBase] = useState(US_BASE);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [connected, setConnected] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasSigningKey, setHasSigningKey] = useState(false);
  const [hasEnvFallback, setHasEnvFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void load().then((d) => {
      setConnected(d.connected);
      setDomain(d.domain);
      setFromName(d.fromName);
      setFromEmail(d.fromEmail);
      setHasApiKey(d.hasApiKey);
      setHasSigningKey(d.hasSigningKey);
      setHasEnvFallback(d.hasEnvFallback);
      if (d.apiBase === EU_BASE) setRegion("eu");
      else if (d.apiBase === US_BASE || !d.apiBase) setRegion("us");
      else { setRegion("custom"); setCustomBase(d.apiBase); }
    }).catch(() => {});
  }, [load]);

  const resolvedBase = region === "eu" ? EU_BASE : region === "us" ? US_BASE : customBase;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sendyHook = `${origin}/api/public/mailgun/mime`;
  const crmHook = `${origin}/api/public/crm-mailgun/inbound`;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await save({
        data: {
          domain,
          apiKey,
          signingKey,
          apiBase: resolvedBase,
          fromName,
          fromEmail,
        },
      });
      setConnected(true);
      setHasApiKey(true);
      if (signingKey) setHasSigningKey(true);
      setApiKey("");
      setSigningKey("");
      setMessage("Configuration Mailgun enregistrée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    setMessage("");
    try {
      await remove();
      setConnected(false);
      setHasApiKey(false);
      setHasSigningKey(false);
      setDomain("");
      setApiKey("");
      setSigningKey("");
      setFromName("");
      setFromEmail("");
      setRegion("us");
      setMessage("Configuration Mailgun supprimée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  function copyUrl(label: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="odoo-settings">
      <h2><Mail size={18} />Connexion Mailgun</h2>
      <p>
        {connected
          ? `Mailgun connecté (${domain})`
          : hasEnvFallback
            ? "Configuration globale active (vous pouvez renseigner votre propre compte Mailgun ci-dessous)"
            : "Connectez votre compte Mailgun pour envoyer et recevoir vos e-mails"}
      </p>

      <form onSubmit={onSubmit}>
        <label>
          Domaine Mailgun (MAILGUN_DOMAIN)
          <input
            required
            type="text"
            autoComplete="off"
            placeholder="mg.monentreprise.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </label>

        <label>
          Clé API Mailgun (MAILGUN_API_KEY)
          <input
            required={!hasApiKey}
            type="password"
            autoComplete="new-password"
            placeholder={hasApiKey ? "Enregistrée (laisser vide pour conserver)" : "key-..."}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>

        <label>
          Clé de signature des webhooks (MAILGUN_WEBHOOK_SIGNING_KEY)
          <input
            type="password"
            autoComplete="new-password"
            placeholder={hasSigningKey ? "Enregistrée (laisser vide pour conserver)" : "Facultatif — requis pour la réception"}
            value={signingKey}
            onChange={(e) => setSigningKey(e.target.value)}
          />
        </label>

        <label>
          Région / URL d’API (MAILGUN_API_BASE)
          <select value={region} onChange={(e) => setRegion(e.target.value as "us" | "eu" | "custom")}>
            <option value="us">États-Unis — https://api.mailgun.net</option>
            <option value="eu">Europe — https://api.eu.mailgun.net</option>
            <option value="custom">URL personnalisée</option>
          </select>
        </label>

        {region === "custom" && (
          <label>
            URL d’API personnalisée
            <input
              required
              type="url"
              placeholder="https://api.eu.mailgun.net"
              value={customBase}
              onChange={(e) => setCustomBase(e.target.value)}
            />
          </label>
        )}

        <label>
          Nom d’expéditeur par défaut (facultatif)
          <input
            type="text"
            placeholder="Jean Dupont"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />
        </label>

        <label>
          Adresse d’expéditeur par défaut (facultatif)
          <input
            type="email"
            placeholder={domain ? `contact@${domain}` : "contact@monentreprise.com"}
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </label>

        {message && <p role="status">{message}</p>}

        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} type="submit">
            {busy && <LoaderCircle className="animate-spin" />}
            {busy ? "Enregistrement…" : connected ? "Mettre à jour" : "Enregistrer"}
          </Button>
          {connected && (
            <Button disabled={busy} type="button" variant="outline" onClick={onDelete}>
              <Trash2 size={14} />Supprimer
            </Button>
          )}
        </div>
      </form>

      {origin && (
        <div className="mt-6 space-y-3 border-t border-border/40 pt-4 text-xs">
          <p className="font-medium">URLs de réception (à configurer dans Mailgun → Receiving → Routes)</p>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-muted-foreground">Sendy :</span>
            <code className="flex-1 truncate rounded bg-muted px-2 py-1">{sendyHook}</code>
            <Button type="button" size="sm" variant="outline" onClick={() => copyUrl("sendy", sendyHook)}>
              {copied === "sendy" ? <Check size={12} /> : <Copy size={12} />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-muted-foreground">CRM :</span>
            <code className="flex-1 truncate rounded bg-muted px-2 py-1">{crmHook}</code>
            <Button type="button" size="sm" variant="outline" onClick={() => copyUrl("crm", crmHook)}>
              {copied === "crm" ? <Check size={12} /> : <Copy size={12} />}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}