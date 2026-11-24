import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { SECTIONS, type SectionContent } from "./sections";

type ProjectInfo = {
  name: string;
  idea: string;
  sector: string | null;
  location: string | null;
  legal_form: string | null;
  currency: string;
  created_at: string;
};

const INDIGO: [number, number, number] = [32, 7, 120];
const PEACH: [number, number, number] = [255, 224, 201];
const GREY: [number, number, number] = [110, 110, 130];

function stripMd(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/`/g, "");
}

export function exportPlanPdf(
  project: ProjectInfo,
  sections: { section_key: string; content: SectionContent }[],
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;

  // ---------- Couverture ----------
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...PEACH);
  doc.circle(W - 60, 90, 130, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PRÉVISIONNEL FINANCIER", M, 160);
  doc.setFontSize(34);
  doc.text(doc.splitTextToSize(project.name, W - M * 2), M, 210);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(
    doc.splitTextToSize(
      [
        project.sector ? `Secteur : ${project.sector}` : null,
        project.location ? `Implantation : ${project.location}` : null,
        project.legal_form ? `Forme juridique : ${project.legal_form}` : null,
        `Devise : ${project.currency}`,
        `Édité le ${new Date().toLocaleDateString("fr-FR")}`,
      ]
        .filter(Boolean)
        .join("\n"),
      W - M * 2,
    ),
    M,
    H - 220,
  );
  doc.setFontSize(9);
  doc.text("Document généré avec Previsio — Financial Intelligence", M, H - 60);

  // ---------- Sommaire ----------
  doc.addPage();
  doc.setTextColor(...INDIGO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Sommaire", M, 80);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 40);
  let y = 120;
  SECTIONS.forEach((def) => {
    const has = sections.some((s) => s.section_key === def.key);
    doc.text(`${def.index}. ${def.title}${has ? "" : "  (non généré)"}`, M, y);
    y += 22;
  });

  // ---------- Sections ----------
  const ordered = SECTIONS.map((def) => ({
    def,
    section: sections.find((s) => s.section_key === def.key),
  })).filter((s) => s.section);

  for (const { def, section } of ordered) {
    const content = section!.content ?? {};
    doc.addPage();
    let cursor = 74;

    doc.setFillColor(...INDIGO);
    doc.rect(0, 0, W, 8, "F");
    doc.setTextColor(...INDIGO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const titleLines = doc.splitTextToSize(`${def.index}. ${def.title}`, W - M * 2);
    doc.text(titleLines, M, cursor);
    cursor += titleLines.length * 20 + 6;

    const write = (text: string, size = 10, bold = false, color = [30, 30, 40]) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(color[0]!, color[1]!, color[2]!);
      const lines = doc.splitTextToSize(stripMd(text), W - M * 2) as string[];
      for (const line of lines) {
        if (cursor > H - 60) {
          doc.addPage();
          cursor = 70;
        }
        doc.text(line, M, cursor);
        cursor += size + 4;
      }
    };

    if (content.summary) {
      write(content.summary, 10.5);
      cursor += 8;
    }

    if (content.kpis?.length) {
      autoTable(doc, {
        startY: cursor,
        head: [["Indicateur clé", "Valeur", "Précision"]],
        body: content.kpis.map((k) => [k.label, k.value, k.hint ?? ""]),
        theme: "grid",
        headStyles: { fillColor: INDIGO, textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: M, right: M },
      });
      cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    }

    for (const table of content.tables ?? []) {
      if (cursor > H - 140) {
        doc.addPage();
        cursor = 70;
      }
      write(table.title, 11, true, INDIGO as unknown as number[]);
      autoTable(doc, {
        startY: cursor,
        head: [table.columns],
        body: table.rows,
        theme: "striped",
        headStyles: { fillColor: INDIGO, textColor: 255, fontSize: 8.5 },
        bodyStyles: { fontSize: 8.5 },
        alternateRowStyles: { fillColor: [248, 246, 252] },
        margin: { left: M, right: M },
      });
      cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
      if (table.note) {
        write(table.note, 8.5, false, GREY as unknown as number[]);
        cursor += 8;
      }
    }

    if (content.narrative) {
      cursor += 6;
      write("Analyse détaillée", 11.5, true, INDIGO as unknown as number[]);
      write(content.narrative, 10);
      cursor += 8;
    }

    if (content.assumptions?.length) {
      write("Hypothèses retenues", 11.5, true, INDIGO as unknown as number[]);
      content.assumptions.forEach((a) => write(`• ${a}`, 9.5));
      cursor += 8;
    }

    if (content.recommendations?.length) {
      write("Recommandations", 11.5, true, INDIGO as unknown as number[]);
      content.recommendations.forEach((r) => write(`• ${r}`, 9.5));
    }
  }

  // ---------- Pagination ----------
  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`${project.name} — Prévisionnel financier`, M, H - 26);
    doc.text(`${i} / ${pages}`, W - M, H - 26, { align: "right" });
  }

  const slug = project.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  doc.save(`previsionnel-${slug}.pdf`);
}
