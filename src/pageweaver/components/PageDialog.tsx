import { useState } from "react";
import { Copy, Download, Monitor, Smartphone, X, Check, Globe, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { publishToOdoo } from "@/pageweaver/lib/odoo.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageDialog({ html, name, onClose }: { html: string; name: string; onClose: () => void }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const publish = useServerFn(publishToOdoo);

  async function sendToOdoo() {
    if (!confirm("Remplacer la page d'accueil de votre site Odoo par cette page ?")) return;
    setPublishing(true);
    try {
      const r = await publish({ data: { title: name || "Accueil", html } });
      if (r.ok) toast.success("Page publiée comme accueil du site Odoo", { action: { label: "Ouvrir", onClick: () => window.open(r.url, "_blank") } });
      else toast.error(r.error);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publication impossible.");
    } finally {
      setPublishing(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <span className="mr-2 font-pw-display font-bold">Page d'accueil</span>
        <div className="flex rounded-md bg-muted p-0.5 text-sm">
          {(["preview", "code"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded px-3 py-1", tab === t && "bg-card shadow-sm")}>
              {t === "preview" ? "Aperçu" : "Code HTML"}
            </button>
          ))}
        </div>
        {tab === "preview" && (
          <div className="flex rounded-md bg-muted p-0.5">
            <button onClick={() => setDevice("desktop")} className={cn("rounded p-1.5", device === "desktop" && "bg-card shadow-sm")} aria-label="Ordinateur"><Monitor className="h-4 w-4" /></button>
            <button onClick={() => setDevice("mobile")} className={cn("rounded p-1.5", device === "mobile" && "bg-card shadow-sm")} aria-label="Mobile"><Smartphone className="h-4 w-4" /></button>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copié" : "Copier"}</Button>
          <Button size="sm" variant="outline" onClick={sendToOdoo} disabled={publishing}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Publier sur Odoo</Button>
          <Button size="sm" onClick={download}><Download className="h-4 w-4" /> Télécharger</Button>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="pw-board-grid flex-1 overflow-auto p-4" style={{ backgroundSize: "22px 22px" }}>
        {tab === "preview" ? (
          <iframe
            title="Aperçu de la page"
            srcDoc={html}
            sandbox="allow-scripts"
            className={cn("mx-auto h-full rounded-lg border bg-card shadow-pw-card", device === "mobile" ? "w-[390px]" : "w-full")}
          />
        ) : (
          <pre className="mx-auto max-w-5xl overflow-auto whitespace-pre-wrap break-all rounded-lg border bg-card p-4 font-mono text-xs">{html}</pre>
        )}
      </div>
    </div>
  );
}
