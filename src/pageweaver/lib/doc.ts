import type { Design } from "./ai.functions";

const ANIM_CSS = `
[data-anim]{opacity:0;transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1),filter .8s}
[data-anim="fade-up"]{transform:translateY(32px)}
[data-anim="zoom-in"]{transform:scale(.92)}
[data-anim="slide-left"]{transform:translateX(48px)}
[data-anim="slide-right"]{transform:translateX(-48px)}
[data-anim="blur-in"]{filter:blur(12px)}
[data-anim].is-in{opacity:1;transform:none;filter:none}
.hover-lift{transition:transform .3s,box-shadow .3s}.hover-lift:hover{transform:translateY(-6px);box-shadow:0 20px 40px -20px rgba(0,0,0,.35)}
.hover-glow{transition:box-shadow .3s}.hover-glow:hover{box-shadow:0 0 0 4px color-mix(in srgb,var(--brand-accent) 35%,transparent)}
@keyframes float{50%{transform:translateY(-12px)}}.float{animation:float 5s ease-in-out infinite}
@keyframes marquee{to{transform:translateX(-50%)}}.marquee{width:max-content;animation:marquee 25s linear infinite}
html{scroll-behavior:smooth}body{margin:0}`;

const ANIM_JS = `(function(){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var d=+e.target.getAttribute('data-delay')||0;setTimeout(function(){e.target.classList.add('is-in')},d);io.unobserve(e.target)}})},{threshold:.12});document.querySelectorAll('[data-anim]').forEach(function(el){io.observe(el)});})();`;

const DEFAULT_PALETTE: Record<string, string> = {
  primary: "#1f1b16",
  secondary: "#3d3529",
  accent: "#e8622c",
  background: "#faf7f2",
  surface: "#ffffff",
  text: "#1f1b16",
  muted: "#7a6f62",
};

export function buildDocument(body: string, design: Design | null | undefined, opts: { title?: string; frameId?: string } = {}) {
  const p: any = { ...DEFAULT_PALETTE, ...(design?.palette ?? {}) };
  const heading = design?.fonts?.heading || "Bricolage Grotesque";
  const bodyFont = design?.fonts?.body || "Instrument Sans";
  const fontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(heading)}:wght@400;600;700;800&family=${encodeURIComponent(bodyFont)}:wght@400;500;600&display=swap`;
  const tw = {
    theme: {
      extend: {
        colors: {
          brand: { primary: p.primary, secondary: p.secondary, accent: p.accent, bg: p.background, surface: p.surface, text: p.text, muted: p.muted },
        },
        fontFamily: { heading: [`'${heading}'`, "sans-serif"], body: [`'${bodyFont}'`, "sans-serif"] },
      },
    },
  };
  const resize = opts.frameId
    ? `<script>(function(){function s(){parent.postMessage({__frame:${JSON.stringify(opts.frameId)},h:document.documentElement.scrollHeight},'*')}new ResizeObserver(s).observe(document.body);window.addEventListener('load',s);setTimeout(s,600);})();</script>`
    : "";
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${(opts.title ?? "Page").replace(/</g, "")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="${fontsUrl}" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config=${JSON.stringify(tw)}</script>
<style>:root{--brand-accent:${p.accent}}${ANIM_CSS}</style>
</head>
<body class="font-body bg-brand-bg text-brand-text antialiased">
${body}
<script>${ANIM_JS}</script>
${resize}
</body>
</html>`;
}
