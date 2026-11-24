import { computeTotals, lineHT } from "./calc";
import { issuerName, invoiceLegalMentions } from "./compliance";
import { DOC_LABEL, type Doc, type Settings } from "./types";

// jsPDF's default fonts can't render the narrow no-break space Intl uses.
const money = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n) || 0).replace(/[\u202f\u00a0]/g, " ");
const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");

/** Builds the SkyVente document as a PDF file in memory (for e-mail attachments). */
export async function buildSkyventePdf(doc: Doc, settings: Settings, signLink?: string): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const c = settings.company;
  const M = 15, W = 210;
  const label = DOC_LABEL[doc.type];

  pdf.setFont("helvetica", "bold").setFontSize(16).text(issuerName(c) || "", M, 20);
  pdf.setFont("helvetica", "normal").setFontSize(9);
  pdf.text([c.address, `${c.zip} ${c.city}`.trim(), c.email, c.phone, c.siret ? `SIRET ${c.siret}` : ""].filter(Boolean), M, 27);

  pdf.setFont("helvetica", "bold").setFontSize(18).text(label.toUpperCase(), W - M, 20, { align: "right" });
  pdf.setFont("helvetica", "normal").setFontSize(10);
  pdf.text([doc.number ?? "Brouillon", `Date : ${date(doc.issue_date)}`, doc.due_date ? `Échéance : ${date(doc.due_date)}` : ""].filter(Boolean), W - M, 27, { align: "right" });

  const cl = doc.client ?? { name: "" };
  pdf.setFont("helvetica", "bold").setFontSize(10).text("DESTINATAIRE", 120, 50);
  pdf.setFont("helvetica", "normal").setFontSize(9);
  pdf.text([cl.name, cl.contact_name, cl.address, `${cl.zip ?? ""} ${cl.city ?? ""}`.trim(), cl.email].filter(Boolean) as string[], 120, 56);

  let y = 82;
  if (doc.title) { pdf.setFont("helvetica", "bold").setFontSize(11).text(doc.title, M, y); y += 6; }
  if (doc.intro) { pdf.setFont("helvetica", "normal").setFontSize(9); const l = pdf.splitTextToSize(doc.intro, W - 2 * M); pdf.text(l, M, y); y += l.length * 4 + 2; }

  autoTable(pdf, {
    startY: y,
    head: [["Désignation", "Qté", "PU HT", "TVA", "Total HT"]],
    body: (doc.items ?? []).map((it) => [
      it.description ? `${it.name}\n${it.description}` : it.name,
      `${it.quantity} ${it.unit ?? ""}`.trim(),
      money(it.unit_price),
      c.vat_exempt ? "—" : `${it.vat_rate} %`,
      money(lineHT(it)),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [31, 41, 55] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: M, right: M },
  });

  const t = computeTotals(doc.items ?? [], doc.global_discount, c.vat_exempt);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((pdf as any).lastAutoTable?.finalY ?? y) + 8;
  const rows: [string, string][] = [["Total HT", money(t.total_ht)]];
  if (t.discount_amount) rows.unshift(["Remise", `- ${money(t.discount_amount)}`]);
  rows.push(["TVA", money(t.total_vat)], ["Total TTC", money(t.total_ttc)]);
  pdf.setFontSize(10);
  for (const [k, v] of rows) {
    pdf.setFont("helvetica", k === "Total TTC" ? "bold" : "normal");
    pdf.text(k, 140, y); pdf.text(v, W - M, y, { align: "right" }); y += 6;
  }
  if (c.vat_exempt) { pdf.setFontSize(8).setFont("helvetica", "normal").text("TVA non applicable, art. 293 B du CGI", W - M, y, { align: "right" }); y += 5; }

  y += 4;
  pdf.setFont("helvetica", "normal").setFontSize(8.5);
  const extra = [doc.notes, doc.terms, signLink ? `Signer en ligne : ${signLink}` : "", ...(doc.type === "invoice" ? invoiceLegalMentions(c) : [])].filter(Boolean) as string[];
  for (const block of extra) {
    const l = pdf.splitTextToSize(block, W - 2 * M);
    if (y + l.length * 4 > 280) { pdf.addPage(); y = 20; }
    pdf.text(l, M, y); y += l.length * 4 + 2;
  }
  if (c.iban && (doc.type === "invoice" || doc.type === "order")) pdf.text(`IBAN ${c.iban}${c.bic ? ` — BIC ${c.bic}` : ""}`, M, Math.min(y + 2, 285));

  return { blob: pdf.output("blob"), filename: `${doc.number || label}.pdf`.replace(/[^\w.-]/g, "_") };
}

/** Safari (surtout en navigation privée) enregistre des fichiers vides avec les liens blob: ; un lien data: fonctionne partout. */
export async function saveBlob(blob: Blob, filename: string) {
  const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Lecture du PDF impossible.")); r.readAsDataURL(blob); });
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}
