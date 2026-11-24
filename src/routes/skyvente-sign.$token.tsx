import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/skyvente/components/ui/button";
import { ScaledPreview } from "@/skyvente/components/DocumentPreview";
import { SignaturePad } from "@/skyvente/components/SignaturePad";
import { sb } from "@/skyvente/lib/supabase";
import { mergeSettings } from "@/skyvente/lib/settings";
import type { Doc, Settings } from "@/skyvente/lib/types";
import { DOC_LABEL } from "@/skyvente/lib/types";

export const Route = createFileRoute("/skyvente-sign/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signature de document — PrestaFlow" },
      { name: "description", content: "Consultez et signez votre document en ligne." },
      { property: "og:title", content: "Signature de document" },
      { property: "og:description", content: "Signature électronique sécurisée." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignThemed,
});

function SignPage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<{ doc: Doc; settings: Settings } | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  const load = () =>
    sb().rpc("sv_get_public_document", { p_token: token }).then(({ data: r }) =>
      setData(r ? { doc: r.doc as Doc, settings: mergeSettings(r.settings) } : null));
  useEffect(() => { load(); }, [token]);

  if (data === undefined) return <div className="sv-app-bg grid min-h-screen place-items-center">Chargement…</div>;
  if (data === null) return <div className="sv-app-bg grid min-h-screen place-items-center">Document introuvable.</div>;
  const { doc, settings } = data;

  const sign = async () => {
    if (!img || name.length < 2 || !agree) return void toast.error("Nom, signature et accord requis");
    const { error } = await sb().rpc("sv_sign_public_document", { p_token: token, p_name: name, p_image: img, p_consent: agree });
    if (error) return void toast.error(error.message);
    toast.success("Document signé, merci !");
    load();
  };

  return (
    <div className="sv-app-bg min-h-screen p-4 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[auto_1fr]">
        <div className="overflow-x-auto"><ScaledPreview scale={0.7} doc={doc} settings={settings} /></div>
        <div className="sv-bento h-fit space-y-4 p-6">
          <h1 className="text-2xl font-bold">{DOC_LABEL[doc.type]} {doc.number}</h1>
          <p className="text-sm text-muted-foreground">Émis par {settings.company.name || "votre prestataire"}</p>
          <Button variant="glass" onClick={() => window.print()}>Télécharger le PDF</Button>
          {doc.signature ? (
            <p className="text-success">✔ Signé par {doc.signature.name} le {new Date(doc.signature.signed_at).toLocaleString("fr-FR")}</p>
          ) : null}
          {doc.signature?.hash ? (
            <p className="break-all text-xs text-muted-foreground">Empreinte d'intégrité (SHA-256) : {doc.signature.hash}</p>
          ) : null}
          {doc.type === "invoice" || doc.type === "credit_note" || doc.signature ? null : (
            <>
              <input className="sv-field" placeholder="Votre nom complet" value={name} onChange={(e) => setName(e.target.value)} />
              <SignaturePad onChange={setImg} />
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
                {doc.type === "delivery" ? "J'atteste la bonne réception des prestations." : "Bon pour accord : j'accepte ce document et ses conditions générales, et je consens à le signer électroniquement."}
              </label>
              <Button variant="holo" className="w-full" onClick={sign}>Signer électroniquement</Button>
              <p className="text-xs text-muted-foreground">Votre signature est horodatée et associée à votre adresse IP et à une empreinte SHA-256 du document (art. 1366-1367 du Code civil).</p>
              {doc.type === "quote" && (
                <button className="w-full text-xs text-muted-foreground underline" onClick={async () => { await sb().rpc("sv_refuse_public_document", { p_token: token }); toast("Devis refusé"); }}>Refuser le devis</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SignThemed() {
  useEffect(() => {
    document.body.classList.add("skyvente-theme");
    return () => document.body.classList.remove("skyvente-theme");
  }, []);
  return (
    <div className="skyvente-theme">
      <SignPage />
    </div>
  );
}
