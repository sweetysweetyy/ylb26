import { jsPDF } from "jspdf";

import type { StudyReport } from "./study-types";

const MARGIN = 18;
const NAVY = { r: 34, g: 45, b: 82 };

type Ctx = { doc: jsPDF; y: number; page: number; width: number; height: number };

function newCtx(doc: jsPDF): Ctx {
  return {
    doc,
    y: MARGIN + 12,
    page: 1,
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  };
}

function footer(ctx: Ctx, title: string) {
  const { doc } = ctx;
  doc.setDrawColor(220);
  doc.line(MARGIN, ctx.height - 14, ctx.width - MARGIN, ctx.height - 14);
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(title.slice(0, 80), MARGIN, ctx.height - 9);
  doc.text(`Page ${ctx.page}`, ctx.width - MARGIN, ctx.height - 9, { align: "right" });
}

function ensure(ctx: Ctx, needed: number, title: string) {
  if (ctx.y + needed > ctx.height - 22) {
    footer(ctx, title);
    ctx.doc.addPage();
    ctx.page += 1;
    ctx.y = MARGIN + 6;
  }
}

function heading(ctx: Ctx, text: string, title: string) {
  ensure(ctx, 20, title);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(13);
  ctx.doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  ctx.doc.text(text, MARGIN, ctx.y);
  ctx.y += 3;
  ctx.doc.setDrawColor(NAVY.r, NAVY.g, NAVY.b);
  ctx.doc.setLineWidth(0.6);
  ctx.doc.line(MARGIN, ctx.y, MARGIN + 26, ctx.y);
  ctx.y += 7;
}

function paragraph(ctx: Ctx, text: string, title: string, opts: { size?: number; color?: number } = {}) {
  const size = opts.size ?? 10;
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(opts.color ?? 45);
  const lines = ctx.doc.splitTextToSize(text, ctx.width - MARGIN * 2) as string[];
  for (const line of lines) {
    ensure(ctx, 6, title);
    ctx.doc.text(line, MARGIN, ctx.y);
    ctx.y += size * 0.52;
  }
  ctx.y += 3;
}

function bullets(ctx: Ctx, items: string[], title: string) {
  for (const item of items) {
    const lines = ctx.doc.splitTextToSize(item, ctx.width - MARGIN * 2 - 6) as string[];
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(10);
    ctx.doc.setTextColor(45);
    lines.forEach((line, i) => {
      ensure(ctx, 6, title);
      if (i === 0) {
        ctx.doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
        ctx.doc.circle(MARGIN + 1.4, ctx.y - 1.4, 0.9, "F");
      }
      ctx.doc.text(line, MARGIN + 5, ctx.y);
      ctx.y += 5.2;
    });
  }
  ctx.y += 3;
}

function table(ctx: Ctx, headers: string[], rows: string[][], title: string) {
  const usable = ctx.width - MARGIN * 2;
  const colWidth = usable / headers.length;
  ensure(ctx, 14, title);
  ctx.doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
  ctx.doc.rect(MARGIN, ctx.y - 4.5, usable, 7, "F");
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(255);
  headers.forEach((h, i) => ctx.doc.text(h, MARGIN + 2 + i * colWidth, ctx.y));
  ctx.y += 7;

  rows.forEach((row, rowIndex) => {
    const cells = row.map((c) => ctx.doc.splitTextToSize(c || "—", colWidth - 4) as string[]);
    const lineCount = Math.max(...cells.map((c) => c.length));
    ensure(ctx, lineCount * 5 + 3, title);
    if (rowIndex % 2 === 0) {
      ctx.doc.setFillColor(244, 246, 250);
      ctx.doc.rect(MARGIN, ctx.y - 4.2, usable, lineCount * 5 + 1.5, "F");
    }
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(45);
    cells.forEach((cell, i) => {
      cell.forEach((line, j) => {
        ctx.doc.text(line, MARGIN + 2 + i * colWidth, ctx.y + j * 4.6);
      });
    });
    ctx.y += lineCount * 5 + 1.5;
  });
  ctx.y += 5;
}

export function exportStudyPdf(
  report: StudyReport,
  meta: { author?: string | undefined; date?: string | undefined },
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ctx = newCtx(doc);
  const title = report.titre || "Étude de marché";

  // Couverture
  doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
  doc.rect(0, 0, ctx.width, ctx.height, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ÉTUDE DE MARCHÉ", MARGIN, 40);
  doc.setFontSize(26);
  const coverTitle = doc.splitTextToSize(title, ctx.width - MARGIN * 2) as string[];
  doc.text(coverTitle, MARGIN, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const sub = doc.splitTextToSize(report.sous_titre || "", ctx.width - MARGIN * 2) as string[];
  doc.text(sub, MARGIN, 62 + coverTitle.length * 11 + 8);
  doc.setDrawColor(255, 224, 201);
  doc.setLineWidth(1.2);
  doc.line(MARGIN, ctx.height - 58, MARGIN + 40, ctx.height - 58);
  doc.setFontSize(10);
  doc.text(`Document réalisé le ${meta.date ?? new Date().toLocaleDateString("fr-FR")}`, MARGIN, ctx.height - 46);
  if (meta.author) doc.text(`Pour : ${meta.author}`, MARGIN, ctx.height - 39);
  doc.text("Rapport généré par Étude de marché — analyse assistée par IA", MARGIN, ctx.height - 32);

  doc.addPage();
  ctx.page = 2;
  ctx.y = MARGIN + 6;

  heading(ctx, "Résumé exécutif", title);
  paragraph(ctx, report.resume_executif ?? "", title);

  if (report.taille_marche?.length) {
    heading(ctx, "Indicateurs clés du marché", title);
    table(
      ctx,
      ["Indicateur", "Valeur", "Commentaire"],
      report.taille_marche.map((i) => [i.indicateur, i.valeur, i.commentaire]),
      title,
    );
  }

  for (const section of report.sections ?? []) {
    heading(ctx, section.titre, title);
    for (const block of (section.contenu ?? "").split("\n\n")) {
      if (block.trim()) paragraph(ctx, block.trim(), title);
    }
    if (section.points_cles?.length) bullets(ctx, section.points_cles, title);
  }

  if (report.segments?.length) {
    heading(ctx, "Segments de marché", title);
    table(
      ctx,
      ["Segment", "Description", "Poids estimé"],
      report.segments.map((s) => [s.nom, s.description, s.poids_estime]),
      title,
    );
  }

  if (report.concurrents?.length) {
    heading(ctx, "Analyse concurrentielle", title);
    table(
      ctx,
      ["Acteur", "Positionnement", "Forces", "Faiblesses"],
      report.concurrents.map((c) => [c.nom, c.positionnement, c.forces, c.faiblesses]),
      title,
    );
  }

  if (report.swot) {
    heading(ctx, "Matrice SWOT", title);
    table(
      ctx,
      ["Forces", "Faiblesses", "Opportunités", "Menaces"],
      [
        [
          (report.swot.forces ?? []).join("\n• "),
          (report.swot.faiblesses ?? []).join("\n• "),
          (report.swot.opportunites ?? []).join("\n• "),
          (report.swot.menaces ?? []).join("\n• "),
        ],
      ],
      title,
    );
  }

  if (report.prix?.length) {
    heading(ctx, "Stratégie tarifaire", title);
    table(
      ctx,
      ["Modèle", "Fourchette", "Justification"],
      report.prix.map((p) => [p.modele, p.fourchette, p.justification]),
      title,
    );
  }

  if (report.recommandations?.length) {
    heading(ctx, "Recommandations", title);
    bullets(ctx, report.recommandations, title);
  }

  if (report.plan_action?.length) {
    heading(ctx, "Plan d'action", title);
    table(
      ctx,
      ["Horizon", "Action", "Indicateur de suivi"],
      report.plan_action.map((a) => [a.horizon, a.action, a.indicateur]),
      title,
    );
  }

  if (report.risques?.length) {
    heading(ctx, "Risques et mitigations", title);
    table(
      ctx,
      ["Risque", "Impact", "Mitigation"],
      report.risques.map((r) => [r.risque, r.impact, r.mitigation]),
      title,
    );
  }

  if (report.methodologie) {
    heading(ctx, "Méthodologie", title);
    paragraph(ctx, report.methodologie, title);
  }

  if (report.sources?.length) {
    heading(ctx, "Sources", title);
    table(
      ctx,
      ["Source", "Origine", "Fiabilité"],
      report.sources.map((s) => [s.titre, s.origine, s.fiabilite]),
      title,
    );
  }

  if (report.limites) {
    heading(ctx, "Limites de l'étude", title);
    paragraph(ctx, report.limites, title, { size: 9, color: 110 });
  }

  footer(ctx, title);
  doc.save(`${title.replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 60) || "etude-de-marche"}.pdf`);
}