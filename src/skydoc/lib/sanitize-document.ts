import DOMPurify from "dompurify";

// Called only after hydration; preserve document formatting and safe SVG icons.
export function sanitizeDocument(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "style", "foreignObject", "animate", "set"],
    FORBID_ATTR: ["srcdoc"],
    ADD_ATTR: ["contenteditable"],
  });
}