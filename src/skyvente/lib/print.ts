// Prints only the document paper in an isolated iframe so the app layout,
// scaling and theme never blank the PDF ("Enregistrer en PDF" in the dialog).
export function printDocument(title: string) {
  const el = document.querySelector<HTMLElement>(".print-area");
  if (!el) return;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join("");
  doc.open();
  doc.write(
    `<!doctype html><html><head><title>${title.replace(/</g, "")}</title>${styles}<style>@page{size:A4;margin:0}html,body{margin:0;background:#fff}.print-area{transform:none!important;box-shadow:none!important;margin:0!important;border-radius:0!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body class="skyvente-theme">${el.outerHTML}</body></html>`,
  );
  doc.close();
  const go = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  setTimeout(go, 400);
}
