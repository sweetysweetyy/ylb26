import { computeTotals, eur, fdate, lineHT } from "@/skyvente/lib/calc";
import type { Block, Doc, DocType, Settings } from "@/skyvente/lib/types";
import { DOC_LABEL } from "@/skyvente/lib/types";
import { invoiceLegalMentions, issuerName } from "@/skyvente/lib/compliance";

/* The paper is a printed artifact: its colours come from the user's saved layout
   settings (data), not from the app theme, so inline styles are intentional here. */

type Props = {
  doc: Pick<
    Doc,
    | "type" | "number" | "status" | "client" | "items" | "issue_date" | "due_date"
    | "intro" | "notes" | "terms" | "global_discount" | "signature" | "title"
  > & { hash?: string | null };
  payments?: { amount: number; payment_date: string; payment_method: string; reference?: string | null }[];
  settings: Settings;
  layoutOverride?: Settings["layouts"][DocType];
  className?: string;
};

const FONT: Record<string, string> = {
  Inter: "'Inter', sans-serif",
  "Space Grotesk": "'Space Grotesk', sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  Helvetica: "Helvetica, Arial, sans-serif",
};

const PAY_LABEL: Record<string, string> = { transfer: "virement", card: "carte bancaire", check: "chèque", cash: "espèces", other: "autre" };

export function DocumentPreview({ doc, settings, layoutOverride, className, payments = [] }: Props) {
  const L = layoutOverride ?? settings.layouts[doc.type];
  const C = settings.company;
  const t = computeTotals(doc.items, doc.global_discount, C.vat_exempt);
  const accent = L.accent;
  const muted = "#6b7280";
  const isInvoice = doc.type === "invoice";
  const isFiscal = isInvoice || doc.type === "credit_note";
  const numberLabel = doc.number ?? (isInvoice ? "BROUILLON" : "—");

  const sec = (b: Block, children: React.ReactNode) => (
    <div key={b.id} style={{ marginTop: b.spacing ?? 16, textAlign: b.align ?? "left" }}>
      {children}
    </div>
  );

  const companyLines = [
    C.address,
    [C.zip, C.city].filter(Boolean).join(" "),
    C.country,
    C.email,
    C.phone,
    C.website,
  ].filter(Boolean);

  const renderBlock = (b: Block) => {
    if (!b.visible) return null;
    switch (b.id) {
      case "header": {
        const logo = L.show_logo && C.logo_url ? (
          <img src={C.logo_url} alt="logo" style={{ maxHeight: 56, maxWidth: 180, objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: 20, fontWeight: 700 }}>{C.name || "Votre entreprise"}</div>
        );
        const titleBox = (
          <div style={{ textAlign: L.header_style === "split" ? "right" : (b.align ?? "left") }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.04em", color: L.header_style === "band" ? "#fff" : accent }}>
              {L.title || DOC_LABEL[doc.type]}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>N° {numberLabel}</div>
          </div>
        );
        if (L.header_style === "band")
          return (
            <div key="header" style={{ background: accent, color: "#fff", margin: "-48px -48px 0", padding: "28px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div style={{ background: C.logo_url && L.show_logo ? "#fff" : "transparent", borderRadius: 8, padding: C.logo_url && L.show_logo ? 6 : 0 }}>{logo}</div>
              {titleBox}
            </div>
          );
        if (L.header_style === "split")
          return (
            <div key="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `3px solid ${accent}`, paddingBottom: 16 }}>
              {logo}
              {titleBox}
            </div>
          );
        return (
          <div key="header" style={{ textAlign: b.align ?? "left" }}>
            <div style={{ display: "inline-block" }}>{logo}</div>
            <div style={{ marginTop: 12, fontSize: 26, fontWeight: 800, color: accent }}>{L.title || DOC_LABEL[doc.type]}</div>
            <div style={{ fontSize: 12, color: muted }}>N° {numberLabel}</div>
          </div>
        );
      }
      case "parties":
        return sec(b,
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, textAlign: "left" }}>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: accent, fontWeight: 700 }}>Émetteur</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{issuerName(C)}{C.legal_form ? ` — ${C.legal_form}` : ""}</div>
              {companyLines.map((l, i) => <div key={i} style={{ color: muted }}>{l}</div>)}
              {C.siret && <div style={{ color: muted }}>SIRET : {C.siret}</div>}
              {C.vat_number && <div style={{ color: muted }}>TVA : {C.vat_number}</div>}
            </div>
            <div style={{ background: `${accent}12`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: accent, fontWeight: 700 }}>Client</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{doc.client.name || "—"}</div>
              {doc.client.contact_name && <div>{doc.client.contact_name}</div>}
              {doc.client.address && <div style={{ color: muted }}>{doc.client.address}</div>}
              {(doc.client.zip || doc.client.city) && <div style={{ color: muted }}>{doc.client.zip} {doc.client.city}</div>}
              {doc.client.country && <div style={{ color: muted }}>{doc.client.country}</div>}
              {doc.client.email && <div style={{ color: muted }}>{doc.client.email}</div>}
              {doc.client.siret && <div style={{ color: muted }}>SIRET : {doc.client.siret}</div>}
              {doc.client.vat_number && <div style={{ color: muted }}>TVA : {doc.client.vat_number}</div>}
            </div>
          </div>,
        );
      case "meta":
        return sec(b,
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: b.align === "right" ? "flex-end" : b.align === "center" ? "center" : "flex-start", fontSize: "0.95em" }}>
            {doc.title && <div><span style={{ color: muted }}>Objet : </span><b>{doc.title}</b></div>}
            <div><span style={{ color: muted }}>Date : </span><b>{fdate(doc.issue_date)}</b></div>
            {doc.due_date && (
              <div><span style={{ color: muted }}>{doc.type === "quote" ? "Valable jusqu'au" : isInvoice ? "Échéance" : "Date prévue"} : </span><b>{fdate(doc.due_date)}</b></div>
            )}
          </div>,
        );
      case "intro":
        return doc.intro ? sec(b, <div style={{ whiteSpace: "pre-wrap" }}>{doc.intro}</div>) : null;
      case "items": {
        const th: React.CSSProperties = { padding: "8px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left" };
        const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top", borderBottom: L.table_style !== "striped" ? "1px solid #e5e7eb" : undefined, border: L.table_style === "boxed" ? "1px solid #e5e7eb" : undefined };
        return sec(b,
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: accent, color: "#fff" }}>
                <th style={th}>Désignation</th>
                <th style={{ ...th, textAlign: "right" }}>Qté</th>
                <th style={{ ...th, textAlign: "right" }}>PU HT</th>
                {!C.vat_exempt && <th style={{ ...th, textAlign: "right" }}>TVA</th>}
                <th style={{ ...th, textAlign: "right" }}>Total HT</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.length === 0 && (
                <tr><td style={{ ...td, color: muted }} colSpan={5}>Aucune prestation</td></tr>
              )}
              {doc.items.map((it, i) => (
                <tr key={it.id} style={{ background: L.table_style === "striped" && i % 2 ? "#f6f7fb" : undefined }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    {it.description && <div style={{ color: muted, fontSize: "0.9em", whiteSpace: "pre-wrap" }}>{it.description}</div>}
                    {it.discount > 0 && <div style={{ color: accent, fontSize: "0.85em" }}>Remise {it.discount}%</div>}
                  </td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{it.quantity} {it.unit}</td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{eur(it.unit_price)}</td>
                  {!C.vat_exempt && <td style={{ ...td, textAlign: "right" }}>{it.vat_rate}%</td>}
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>{eur(lineHT(it))}</td>
                </tr>
              ))}
            </tbody>
          </table>,
        );
      }
      case "totals": {
        const justify = b.align === "left" ? "flex-start" : b.align === "center" ? "center" : "flex-end";
        const row = (l: string, v: string, strong = false) => (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: strong ? 800 : 400 }}>
            <span>{l}</span><span>{v}</span>
          </div>
        );
        return (
          <div key="totals" style={{ marginTop: b.spacing ?? 12, display: "flex", justifyContent: justify }}>
            <div style={{ width: 260 }}>
              {t.discount_amount > 0 && row("Sous-total HT", eur(t.subtotal))}
              {t.discount_amount > 0 && row(`Remise ${doc.global_discount}%`, `- ${eur(t.discount_amount)}`)}
              {row("Total HT", eur(t.total_ht))}
              {!C.vat_exempt && Object.entries(t.vat).map(([r, v]) => row(`TVA ${r}%`, eur(v)))}
              <div style={{ background: accent, color: "#fff", borderRadius: 6, padding: "8px 10px", marginTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1.1em" }}>
                <span>{C.vat_exempt ? "Total" : "Total TTC"}</span><span>{eur(t.total_ttc)}</span>
              </div>
              {C.vat_exempt && <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>TVA non applicable, art. 293 B du CGI</div>}
              {payments.length > 0 && (() => {
                const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
                const rest = Math.max(0, Math.round((t.total_ttc - paid) * 100) / 100);
                return (
                  <div style={{ marginTop: 8, fontSize: 10 }}>
                    {payments.map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", color: muted, padding: "2px 0" }}>
                        <span>Réglé le {fdate(p.payment_date)} par {PAY_LABEL[p.payment_method] ?? p.payment_method}</span><span>- {eur(Number(p.amount))}</span>
                      </div>
                    ))}
                    {rest > 0 ? row("Reste à payer", eur(rest), true)
                      : <div style={{ marginTop: 6, border: `2px solid ${accent}`, color: accent, borderRadius: 6, padding: "4px 8px", textAlign: "center", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Facture acquittée</div>}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      }
      case "notes":
        return doc.notes ? sec(b,
          <div><div style={{ fontWeight: 700, color: accent, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Notes</div><div style={{ whiteSpace: "pre-wrap" }}>{doc.notes}</div></div>,
        ) : null;
      case "terms":
        return sec(b,
          <div style={{ fontSize: "0.85em", color: muted, whiteSpace: "pre-wrap" }}>
            {doc.terms}
            {isFiscal && (
              <div style={{ marginTop: 6 }}>
                {invoiceLegalMentions(C).map((m, i) => <div key={i}>{m}</div>)}
                {C.iban && <div style={{ marginTop: 4, color: "#111" }}>IBAN : {C.iban}{C.bic ? ` — BIC : ${C.bic}` : ""}</div>}
              </div>
            )}
          </div>,
        );
      case "signature":
        if (isInvoice) return null;
        return sec(b,
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 260, border: `1px dashed ${accent}`, borderRadius: 8, padding: 12, minHeight: 110, textAlign: "left" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: accent, fontWeight: 700 }}>
                {doc.type === "delivery" ? "Réception — signature du client" : "Bon pour accord — signature du client"}
              </div>
              {doc.signature ? (
                <>
                  <img src={doc.signature.image} alt="signature" style={{ maxHeight: 70, marginTop: 6 }} />
                  <div style={{ fontSize: 10, color: muted }}>
                    Signé électroniquement par {doc.signature.name} le {new Date(doc.signature.signed_at).toLocaleString("fr-FR")}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 10, color: muted, marginTop: 50 }}>Date, nom et signature</div>
              )}
            </div>
          </div>,
        );
      case "custom":
        return b.text ? sec(b, <div style={{ whiteSpace: "pre-wrap" }}>{b.text}</div>) : null;
      case "footer": {
        const legal = [C.name, C.legal_form, C.capital && `Capital ${C.capital}`, C.siret && `SIRET ${C.siret}`, C.rcs, C.vat_number && `TVA ${C.vat_number}`].filter(Boolean).join(" · ");
        return (
          <div key="footer" style={{ marginTop: "auto", paddingTop: b.spacing ?? 28, textAlign: b.align ?? "center", fontSize: 9, color: muted }}>
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
              {L.footer && <div style={{ whiteSpace: "pre-wrap" }}>{L.footer}</div>}
              <div>{legal}</div>
              {isFiscal && doc.hash && <div style={{ marginTop: 4, wordBreak: "break-all" }}>Empreinte d'intégrité (SHA-256) : {doc.hash}</div>}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div
      className={`print-area ${className ?? ""}`}
      style={{
        width: 794,
        minHeight: 1123,
        background: "#ffffff",
        color: L.text_color,
        fontFamily: FONT[L.font] ?? FONT.Inter,
        fontSize: L.font_size,
        lineHeight: 1.5,
        padding: 48,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 30px 80px -30px rgba(0,0,0,.6)",
        borderRadius: 4,
      }}
    >
      {L.blocks.map(renderBlock)}
    </div>
  );
}

/** Scales the A4 paper to fit its container width */
export function ScaledPreview(props: Props & { scale?: number }) {
  const s = props.scale ?? 0.72;
  return (
    <div style={{ width: 794 * s, height: 1123 * s }} className="scaled-preview mx-auto">
      <div className="scaled-preview-inner" style={{ transform: `scale(${s})`, transformOrigin: "top left" }}>
        <DocumentPreview {...props} />
      </div>
    </div>
  );
}
