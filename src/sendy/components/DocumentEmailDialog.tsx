import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Loader2, Mail, Save, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sy } from "@/sendy/lib/db";
import { sendEmail } from "@/sendy/lib/mail.functions";
import { draftDocumentEmail } from "@/sendy/lib/doc-mail.functions";
import { useMailbox, useMailConfig } from "@/sendy/components/use-mailbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type DocMailApp = "skyvente" | "skyachat";

export type DocumentEmailProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  app: DocMailApp;
  docId: string;
  docType: string;
  docLabel: string;
  docNumber: string | null;
  recipient: string;
  defaultSubject: string;
  /** Values for {{placeholders}} in saved templates (numero, type, contact, societe, montant, echeance…). */
  vars: Record<string, string>;
  /** Plain-text facts given to the AI. */
  facts: string;
  /** Builds the PDF to attach. */
  getPdf: () => Promise<{ blob: Blob; filename: string }>;
  onSent?: () => void;
};

const fill = (t: string, v: Record<string, string>) => t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => v[k] ?? "");

function blobToBase64(b: Blob) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(b);
  });
}

export function DocumentEmailDialog(p: DocumentEmailProps) {
  const { data: mailbox, isLoading: mbLoading } = useMailbox();
  const { data: cfg } = useMailConfig();
  const send = useServerFn(sendEmail);
  const draft = useServerFn(draftDocumentEmail);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [pdf, setPdf] = useState<{ blob: Blob; filename: string } | null>(null);
  const [busy, setBusy] = useState<"" | "ai" | "send" | "tpl">("");

  const { data: history = [] } = useQuery({
    queryKey: ["doc-mail-history", p.app, p.docId],
    enabled: p.open,
    queryFn: async () => (await sy(supabase).from("sendy_mail_messages").select("id,to_addresses,created_at")
      .eq("app_source", p.app).eq("document_id", p.docId).order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  useEffect(() => {
    if (!p.open) return;
    let alive = true;
    setTo(p.recipient); setCc(""); setPdf(null);
    setSubject(p.defaultSubject); setText("");
    (async () => {
      const { data: tpl } = await sy(supabase).from("sendy_mail_templates").select("subject_template,body_template")
        .eq("app", p.app).eq("doc_type", p.docType).maybeSingle();
      if (alive && tpl) { setSubject(fill(tpl.subject_template, p.vars)); setText(fill(tpl.body_template, p.vars)); }
    })();
    p.getPdf().then((f) => alive && setPdf(f)).catch(() => toast.error("Impossible de générer le PDF."));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open]);

  const from = mailbox && cfg?.domain ? `${mailbox.display_name} <${mailbox.local_part}@${cfg.domain}>` : "";

  async function magic() {
    setBusy("ai");
    try {
      const r = await draft({ data: { app: p.app, docLabel: p.docLabel, facts: p.facts, subject, current: text || undefined } });
      if (r.text) setText(r.text); else toast.error(r.error ?? "Échec");
    } catch { toast.error("La rédaction automatique a échoué."); } finally { setBusy(""); }
  }

  async function saveTemplate() {
    setBusy("tpl");
    // Turn the current values back into placeholders so the template works for the next document.
    const unfill = (t: string) => Object.entries(p.vars).filter(([, v]) => v && v.length > 2)
      .sort((a, b) => b[1].length - a[1].length).reduce((s, [k, v]) => s.split(v).join(`{{${k}}}`), t);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await sy(supabase).from("sendy_mail_templates").upsert({
      user_id: u.user!.id, app: p.app, doc_type: p.docType, subject_template: unfill(subject), body_template: unfill(text), updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,app,doc_type" });
    setBusy("");
    if (error) toast.error(error.message); else toast.success(`Modèle « ${p.docLabel} » enregistré`);
  }

  async function onSend() {
    if (!pdf) return void toast.error("Le PDF n'est pas encore prêt.");
    setBusy("send");
    try {
      const base64 = await blobToBase64(pdf.blob);
      const r = await send({ data: {
        to, cc: cc || undefined, subject, text,
        attachments: [{ filename: pdf.filename, contentType: "application/pdf", base64 }],
        link: { app_source: p.app, document_id: p.docId, document_number: p.docNumber },
      } });
      if (!r.ok) return void toast.error(r.error);
      toast.success("E-mail envoyé");
      p.onSent?.();
      p.onOpenChange(false);
    } catch { toast.error("Envoi impossible : vérifiez les adresses."); } finally { setBusy(""); }
  }

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Envoyer {p.docLabel.toLowerCase()} par e-mail</DialogTitle></DialogHeader>
        {!mbLoading && !mailbox ? (
          <div className="rounded-2xl border bg-muted p-4 text-sm">
            <p className="font-medium">Il vous faut d'abord une adresse d'envoi Sendy.</p>
            <p className="mt-1 text-muted-foreground">Réservez-la en quelques secondes dans SENDYME, puis revenez ici pour envoyer votre document.</p>
            <Button asChild className="mt-3" size="sm"><Link to="/sendy">Ouvrir SENDYME</Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">De : {from || "…"}</p>
            <Input aria-label="Destinataire" placeholder="À (séparez par des virgules)" value={to} onChange={(e) => setTo(e.target.value)} />
            <Input aria-label="Copie" placeholder="Cc" value={cc} onChange={(e) => setCc(e.target.value)} />
            <Input aria-label="Objet" placeholder="Objet" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <div className="relative">
              <Textarea aria-label="Message" rows={10} placeholder="Votre message… ou cliquez sur la baguette magique" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <FileText className="h-4 w-4" />
              {pdf ? <span>{pdf.filename} <span className="text-muted-foreground">({Math.max(1, Math.round(pdf.blob.size / 1024))} Ko)</span></span> : <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Préparation du PDF…</span>}
            </div>
            {history.length > 0 && (
              <p className="text-xs text-muted-foreground">Déjà envoyé : {history.map((h) => `${new Date(h.created_at ?? 0).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} à ${h.to_addresses}`).join(" · ")}</p>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={!!busy} onClick={magic}>{busy === "ai" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}Baguette magique</Button>
                <Button type="button" variant="ghost" disabled={!!busy || !text} onClick={saveTemplate}><Save className="mr-1 h-4 w-4" />Enregistrer comme modèle</Button>
              </div>
              <Button type="button" disabled={!!busy || !pdf || !to || !text} onClick={onSend}>{busy === "send" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Envoyer</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
