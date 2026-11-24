import {
  DOC_LABEL,
  computeTotals,
  formatDate,
  lineTotal,
  operationNature,
  type ContactSnapshot,
  type DocType,
  type LineItem,
  type Settings,
} from "./doc";

export type PdfDoc = {
  type: DocType;
  number: string;
  title: string;
  issue_date: string;
  due_date?: string | null;
  delivery_date?: string | null;
  delivery_address?: string;
  supplier_reference?: string;
  contact: ContactSnapshot;
  items: LineItem[];
  discount_percent: number;
  shipping: number;
  currency: string;
  notes: string;
  payment_terms: string;
  signer_name?: string;
  signature_data_url?: string;
  signed_at?: string | null;
  reception_ok?: boolean;
  reception_remarks?: string;
  source_number?: string;
};

type S = Partial<Settings>;

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "#1f4d3a").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

// jsPDF's default fonts can't render the narrow no-break space Intl uses.
function money(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency })
    .format(Number(n) || 0)
    .replace(/[\u202f\u00a0]/g, " ");
}

function imgFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

async function imgSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => res({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

export async function buildPdf(doc: PdfDoc, settings: S) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 15;
  const primary = hexToRgb(settings.primary_color || "#1f4d3a");
  const accent = hexToRgb(settings.accent_color || "#c8873a");
  const cur = doc.currency || settings.currency || "EUR";

  // Top band
  pdf.setFillColor(...primary);
  pdf.rect(0, 0, W, 4, "F");

  // Logo + issuer
  let y = 14;
  if (settings.logo_data_url) {
    try {
      const { w, h } = await imgSize(settings.logo_data_url);
      const maxW = 42, maxH = 20;
      const ratio = Math.min(maxW / w, maxH / h);
      pdf.addImage(settings.logo_data_url, imgFormat(settings.logo_data_url), M, y, w * ratio, h * ratio);
    } catch {
      /* ignore broken logo */
    }
  } else if (settings.company_name) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...primary);
    pdf.text(settings.company_name, M, y + 8);
  }

  // Title block (right)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...primary);
  pdf.text(DOC_LABEL[doc.type].toUpperCase(), W - M, y + 5, { align: "right" });
  pdf.setFontSize(10);
  pdf.setTextColor(60);
  pdf.setFont("helvetica", "normal");
  const meta: string[] = [`N° ${doc.number || "—"}`, `Date : ${formatDate(doc.issue_date)}`];
  if (doc.type === "invoice" || doc.type === "credit_note" || doc.type === "order") meta.push(operationNature(doc.items));
  if (doc.due_date) meta.push(`${doc.type === "invoice" ? "Échéance" : doc.type === "quote" ? "Réponse souhaitée" : "Livraison souhaitée"} : ${formatDate(doc.due_date)}`);
  if (doc.delivery_date) meta.push(`Livraison : ${formatDate(doc.delivery_date)}`);
  if (doc.source_number) meta.push(`Réf. : ${doc.source_number}`);
  if (doc.supplier_reference) meta.push(`Réf. fournisseur : ${doc.supplier_reference}`);
  meta.forEach((m, i) => pdf.text(m, W - M, y + 12 + i * 5, { align: "right" }));

  y = Math.max(y + 12 + meta.length * 5, 44) + 4;

  // Parties
  const colW = (W - 2 * M - 8) / 2;
  const isInvoice = doc.type === "invoice" || doc.type === "credit_note";
  const leftTitle = isInvoice ? "FOURNISSEUR" : "ÉMETTEUR";
  const rightTitle = isInvoice ? "FACTURÉ À" : "DESTINATAIRE";
  const issuer = [
    [settings.company_name, settings.legal_form].filter(Boolean).join(" "),
    settings.capital ? `Capital : ${settings.capital}` : "",
    settings.address,
    [settings.zip, settings.city].filter(Boolean).join(" "),
    settings.country,
    settings.email,
    settings.phone,
    settings.siret ? `SIRET : ${settings.siret}` : "",
    settings.siret && settings.rcs_city ? `RCS ${settings.rcs_city} ${settings.siret.replace(/\s/g, "").slice(0, 9)}` : "",
    settings.vat_number ? `TVA : ${settings.vat_number}` : "",
  ].filter(Boolean) as string[];
  const c = doc.contact;
  const contactLines = [
    c.company,
    c.contact_name,
    c.address,
    [c.zip, c.city].filter(Boolean).join(" "),
    c.country,
    c.email,
    c.phone,
    c.siret ? `SIRET : ${c.siret}` : "",
    c.vat_number ? `TVA : ${c.vat_number}` : "",
  ].filter(Boolean);
  const left = isInvoice ? contactLines : issuer;
  const right = isInvoice ? issuer : contactLines;

  const boxH = Math.max(left.length, right.length) * 4.6 + 12;
  pdf.setDrawColor(225);
  pdf.setFillColor(248, 246, 241);
  pdf.roundedRect(M, y, colW, boxH, 2, 2, "F");
  pdf.setFillColor(...accent);
  pdf.rect(M + colW + 8, y, 1.2, boxH, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...accent);
  pdf.text(leftTitle, M + 4, y + 6);
  pdf.text(rightTitle, M + colW + 13, y + 6);
  pdf.setTextColor(40);
  pdf.setFontSize(9.5);
  left.forEach((l, i) => {
    pdf.setFont("helvetica", i === 0 ? "bold" : "normal");
    pdf.text(String(l), M + 4, y + 12 + i * 4.6);
  });
  right.forEach((l, i) => {
    pdf.setFont("helvetica", i === 0 ? "bold" : "normal");
    pdf.text(String(l), M + colW + 13, y + 12 + i * 4.6);
  });
  y += boxH + 8;

  if (doc.title) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(30);
    pdf.text(`Objet : ${doc.title}`, M, y);
    y += 6;
  }
  if (doc.delivery_address) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    pdf.text(`Adresse de livraison : ${doc.delivery_address}`, M, y);
    y += 6;
  }

  // Items table
  autoTable(pdf, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Désignation", "Qté", "Unité", "P.U. HT", "Rem.", "TVA", "Total HT"]],
    body: doc.items.map((i) => [
      { content: `${i.reference ? `[${i.reference}] ` : ""}${i.name}${i.description ? `\n${i.description}` : ""}` },
      String(i.quantity),
      i.unit,
      money(i.unit_price, cur),
      i.discount ? `${i.discount}%` : "—",
      `${i.vat_rate}%`,
      money(lineTotal(i), cur),
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.4, textColor: 40, lineColor: 230, lineWidth: 0.1 },
    headStyles: { fillColor: primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 249, 246] },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold" },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (pdf as any).lastAutoTable.finalY + 6;

  // Totals
  const t = computeTotals(doc.items, doc.discount_percent, doc.shipping);
  const rows: [string, string][] = [["Sous-total HT", money(t.subtotal, cur)]];
  if (t.discount) rows.push([`Remise ${doc.discount_percent}%`, `- ${money(t.discount, cur)}`]);
  if (t.shipping) rows.push(["Frais de port HT", money(t.shipping, cur)]);
  rows.push(["Total HT", money(t.ht, cur)]);
  t.vatByRate.forEach((v) => rows.push([`TVA ${v.rate}% (base ${money(v.base, cur)})`, money(v.vat, cur)]));
  const tx = W - M - 80;
  if (y + rows.length * 6 + 16 > 270) {
    pdf.addPage();
    y = 20;
  }
  pdf.setFontSize(9.5);
  rows.forEach(([k, v], i) => {
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(70);
    pdf.text(k, tx, y + i * 6);
    pdf.setTextColor(30);
    pdf.text(v, W - M, y + i * 6, { align: "right" });
  });
  y += rows.length * 6;
  pdf.setFillColor(...primary);
  pdf.roundedRect(tx - 3, y - 2, 83, 10, 1.5, 1.5, "F");
  pdf.setTextColor(255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("TOTAL TTC", tx, y + 4.8);
  pdf.text(money(t.ttc, cur), W - M - 2, y + 4.8, { align: "right" });
  y += 16;

  // Notes / terms
  const block = (label: string, text?: string) => {
    if (!text) return;
    const lines = pdf.splitTextToSize(text, W - 2 * M);
    if (y + lines.length * 4.4 + 8 > 275) {
      pdf.addPage();
      y = 20;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...accent);
    pdf.text(label.toUpperCase(), M, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(60);
    pdf.text(lines, M, y + 5);
    y += lines.length * 4.4 + 9;
  };
  block("Conditions de paiement", doc.payment_terms);
  block("Notes", doc.notes);
  if (doc.type === "invoice" && settings.iban) block("Coordonnées bancaires", `IBAN : ${settings.iban}`);
  if (doc.type === "order" || doc.type === "invoice" || doc.type === "credit_note") {
    block(
      "Mentions légales",
      [
        settings.late_penalty_rate && `Pénalités de retard : ${settings.late_penalty_rate}.`,
        settings.recovery_fee_mention !== false && "Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 € (art. L.441-10 et D.441-5 du Code de commerce).",
        settings.early_payment_discount && `Escompte : ${settings.early_payment_discount}.`,
        settings.vat_exemption_mention,
      ].filter(Boolean).join("\n"),
    );
  }

  // Delivery / reception certificate
  if (doc.type === "delivery") {
    block(
      "Attestation de réception",
      `Le signataire atteste avoir réceptionné les biens et/ou prestations listés ci-dessus ${
        doc.reception_ok ? "conformes à la commande et en bon état." : "avec les réserves ci-dessous."
      }${doc.reception_remarks ? `\nRéserves / remarques : ${doc.reception_remarks}` : ""}`,
    );
  }
  if (doc.type === "delivery" || doc.type === "order") {
    if (y + 40 > 278) {
      pdf.addPage();
      y = 20;
    }
    const bw = (W - 2 * M - 10) / 2;
    pdf.setDrawColor(200);
    pdf.roundedRect(M, y, bw, 34, 2, 2);
    pdf.roundedRect(M + bw + 10, y, bw, 34, 2, 2);
    pdf.setFontSize(8.5);
    pdf.setTextColor(90);
    pdf.setFont("helvetica", "bold");
    pdf.text(doc.type === "delivery" ? "Signature du réceptionnaire" : "Bon pour accord — l'acheteur", M + 3, y + 5);
    pdf.text(doc.type === "delivery" ? "Signature du fournisseur / prestataire" : "Accusé de réception — le fournisseur", M + bw + 13, y + 5);
    pdf.setFont("helvetica", "normal");
    if (doc.signer_name) pdf.text(`${doc.signer_name}${doc.signed_at ? ` — le ${formatDate(doc.signed_at)}` : ""}`, M + 3, y + 31);
    if (doc.signature_data_url) {
      try {
        pdf.addImage(doc.signature_data_url, "PNG", M + 6, y + 7, bw - 12, 20);
      } catch {
        /* ignore */
      }
    }
    y += 40;
  }

  // Footer on each page
  const footerText = [
    doc.type === "quote" ? settings.quote_footer : doc.type === "delivery" ? settings.delivery_footer : doc.type === "order" ? settings.order_footer : settings.invoice_footer,
    settings.legal_mentions,
  ]
    .filter(Boolean)
    .join(" — ");
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(...accent);
    pdf.setLineWidth(0.4);
    pdf.line(M, 283, W - M, 283);
    pdf.setFontSize(7.5);
    pdf.setTextColor(110);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(
      footerText ||
        [settings.company_name, settings.siret && `SIRET ${settings.siret}`, settings.vat_number && `TVA ${settings.vat_number}`]
          .filter(Boolean)
          .join(" · "),
      W - 2 * M - 20,
    );
    pdf.text(lines.slice(0, 2), M, 287);
    pdf.text(`${p} / ${pages}`, W - M, 287, { align: "right" });
  }

  return pdf;
}

export async function pdfFile(doc: PdfDoc, settings: S): Promise<{ blob: Blob; filename: string }> {
  const pdf = await buildPdf(doc, settings);
  return { blob: pdf.output("blob"), filename: `${doc.number || DOC_LABEL[doc.type]}.pdf`.replace(/[^\w.-]/g, "_") };
}

export async function downloadPdf(doc: PdfDoc, settings: S) {
  const { blob, filename } = await pdfFile(doc, settings);
  const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Lecture du PDF impossible.")); r.readAsDataURL(blob); });
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}
