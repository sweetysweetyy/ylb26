export type StyleOptions = {
  palette: string;
  primary: string;
  background: string;
  text: string;
  typography: string;
  density: string;
  imagery: string;
  withImages: boolean;
};

export type Brief = {
  company: string;
  sector: string;
  goal: string;
  tone: string;
  description: string;
  pages: number;
  features: string[];
};

export type PlanSection = {
  heading: string;
  body: string;
  cta_label: string | null;
};

export type PlanPage = {
  title: string;
  slug: string;
  summary: string;
  image_prompt: string | null;
  sections: PlanSection[];
};

export type SitePlan = {
  site_name: string;
  tagline: string;
  pages: PlanPage[];
};

export const PALETTES: Record<string, { primary: string; background: string; text: string; label: string }> = {
  terre: { label: "Terre cuite", primary: "#C0502E", background: "#F6F1E9", text: "#14110D" },
  foret: { label: "Forêt", primary: "#2F6B4F", background: "#F3F5F1", text: "#12211A" },
  encre: { label: "Encre & or", primary: "#B98A2E", background: "#14181D", text: "#E9EEF2" },
  azur: { label: "Azur", primary: "#1D5FA8", background: "#F4F7FB", text: "#0F1B2A" },
};

export const TYPOGRAPHIES: Record<string, { label: string; heading: string; body: string }> = {
  grotesque: { label: "Grotesque", heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" },
  serif: { label: "Serif éditorial", heading: "Georgia, 'Times New Roman', serif", body: "'Inter', sans-serif" },
  neutre: { label: "Neutre", heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
};

export const FEATURES: Record<string, { label: string; module: string }> = {
  boutique: { label: "Boutique en ligne", module: "website_sale" },
  blog: { label: "Blog", module: "website_blog" },
  formulaire: { label: "Formulaires de contact", module: "website_crm" },
  rendezvous: { label: "Prise de rendez-vous", module: "website_appointment" },
};

const SPACING: Record<string, string> = {
  aeree: "96px 24px",
  equilibree: "72px 24px",
  dense: "48px 24px",
};

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Construit le HTML d'une page à partir du plan et du style, en blocs Odoo natifs. */
export function buildPageHtml(page: PlanPage, style: StyleOptions, imageUrl: string | null) {
  const font = TYPOGRAPHIES[style.typography] ?? TYPOGRAPHIES["grotesque"]!;
  const pad = SPACING[style.density] ?? SPACING["equilibree"]!;
  const primary = style.primary;

  const hero = `<section class="s_text_block" style="background-color:${style.background};color:${style.text};padding:${pad};font-family:${font.body};">
  <div class="container">
    <h1 style="font-family:${font.heading};font-size:44px;line-height:1.1;margin-bottom:16px;color:${style.text};">${esc(page.title)}</h1>
    <p style="font-size:18px;max-width:680px;opacity:.8;">${esc(page.summary)}</p>
    ${imageUrl ? `<img src="${imageUrl}" alt="${esc(page.title)}" class="img img-fluid" style="margin-top:32px;border-radius:12px;width:100%;object-fit:cover;"/>` : ""}
  </div>
</section>`;

  const sections = page.sections
    .map(
      (section, index) => `<section class="s_text_block" style="background-color:${
        index % 2 === 0 ? "#ffffff" : style.background
      };color:${style.text};padding:${pad};font-family:${font.body};">
  <div class="container">
    <h2 style="font-family:${font.heading};font-size:28px;margin-bottom:12px;color:${style.text};">${esc(section.heading)}</h2>
    <p style="font-size:16px;line-height:1.7;max-width:760px;opacity:.85;">${esc(section.body)}</p>
    ${
      section.cta_label
        ? `<p style="margin-top:24px;"><a href="/contactus" class="btn" style="background-color:${primary};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;">${esc(section.cta_label)}</a></p>`
        : ""
    }
  </div>
</section>`,
    )
    .join("\n");

  return `${hero}\n${sections}`;
}

export function planSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["site_name", "tagline", "pages"],
    properties: {
      site_name: { type: "string" },
      tagline: { type: "string" },
      pages: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "slug", "summary", "image_prompt", "sections"],
          properties: {
            title: { type: "string" },
            slug: { type: "string" },
            summary: { type: "string" },
            image_prompt: { type: ["string", "null"] },
            sections: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["heading", "body", "cta_label"],
                properties: {
                  heading: { type: "string" },
                  body: { type: "string" },
                  cta_label: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
    },
  } as Record<string, unknown>;
}
