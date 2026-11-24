import { extractText, getDocumentProxy } from "unpdf";

export function base64ToUint8(base64: string): Uint8Array {
  const clean = (base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64).replace(
    /\s/g,
    "",
  );
  const binaryString = atob(clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function clean(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extraction texte ultra tolérante :
 * 1. unpdf en mode fusionné,
 * 2. repli page par page (PDF partiellement corrompus),
 * 3. repli brut sur les chaînes lisibles du flux PDF.
 * Ne lève jamais : renvoie une chaîne (éventuellement vide) pour laisser
 * l'appelant basculer sur la lecture multimodale par IA.
 */
export async function extractPdfText(base64: string): Promise<string> {
  const bytes = base64ToUint8(base64);

  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const merged = clean(Array.isArray(text) ? text.join("\n") : String(text ?? ""));
    if (merged.replace(/\s/g, "").length >= 80) return merged;
  } catch {
    /* on tente les replis */
  }

  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [String(text ?? "")];
    const joined = clean(pages.filter(Boolean).join("\n\n"));
    if (joined.replace(/\s/g, "").length >= 80) return joined;
  } catch {
    /* dernier repli */
  }

  return clean(rawPdfStrings(bytes));
}

/** Dernier recours : récupère les littéraux texte non compressés du PDF. */
function rawPdfStrings(bytes: Uint8Array): string {
  let source = "";
  try {
    source = new TextDecoder("latin1").decode(bytes);
  } catch {
    return "";
  }
  const chunks: string[] = [];
  const regex = /\(((?:\\.|[^\\()])*)\)\s*Tj|\[((?:\\.|[^\\\]])*)\]\s*TJ/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    const piece = (match[1] ?? match[2] ?? "")
      .replace(/\\([()\\])/g, "$1")
      .replace(/\)\s*-?\d+(\.\d+)?\s*\(/g, "")
      .replace(/[()]/g, " ");
    if (piece.trim()) chunks.push(piece);
  }
  return chunks.join(" ").replace(/\s{2,}/g, " ").trim();
}

export function isProbablyPdf(base64: string, filename: string, mime: string) {
  return mime.includes("pdf") || filename.toLowerCase().endsWith(".pdf");
}
