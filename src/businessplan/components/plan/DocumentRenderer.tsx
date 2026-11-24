import type { Brand, PlanContent } from "@/businessplan/lib/plan-schema";
import { DEFAULT_BRAND, isPlanContent } from "@/businessplan/lib/plan-schema";
import { BlockRenderer } from "./PlanBlocks";

export function DocumentRenderer({
  content,
  brand: brandInput,
  paged = true,
}: {
  content: PlanContent;
  brand?: Partial<Brand>;
  paged?: boolean;
}) {
  if (!isPlanContent(content)) return null;

  const brand: Brand = { ...DEFAULT_BRAND, ...brandInput };
  const palette = { primary: brand.primary, accent: brand.accent, ink: brand.ink };
  const company = brand.companyName || content.company || "";

  const coverBackground =
    brand.cover === "sobre"
      ? brand.surface
      : brand.cover === "editorial"
        ? `linear-gradient(135deg, ${brand.surface} 0%, ${brand.accent}88 100%)`
        : `radial-gradient(120% 90% at 0% 0%, ${brand.accent}CC 0%, transparent 55%), radial-gradient(110% 90% at 100% 100%, ${brand.primary}33 0%, transparent 60%), ${brand.surface}`;

  return (
    <article
      className="mx-auto w-full max-w-[820px]"
      style={{
        background: brand.surface,
        color: brand.ink,
        fontFamily: `"${brand.fontBody}", Inter, sans-serif`,
      }}
    >
      {/* Couverture */}
      <section
        className={`${paged ? "print-page" : ""} flex min-h-[900px] flex-col justify-between p-12`}
        style={{ background: coverBackground }}
      >
        <header className="flex items-center justify-between">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={company || "Logo"} className="max-h-14 object-contain" />
          ) : (
            <span
              className="text-sm font-semibold uppercase tracking-[0.28em]"
              style={{ color: brand.primary }}
            >
              {company || "Business Plan"}
            </span>
          )}
          <span className="text-xs uppercase tracking-[0.22em] opacity-50">{content.date || ""}</span>
        </header>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: brand.primary }}>
            Dossier de financement
          </p>
          <h1
            className="mt-5 text-[3.2rem] leading-[1.05] font-semibold"
            style={{ fontFamily: `"${brand.fontDisplay}", sans-serif`, color: brand.ink }}
          >
            {content.title}
          </h1>
          {content.subtitle ? (
            <p className="mt-5 max-w-xl text-lg leading-relaxed opacity-70">{content.subtitle}</p>
          ) : null}
          <div className="mt-10 h-1 w-28 rounded-full" style={{ background: brand.primary }} />
        </div>

        <footer className="flex items-end justify-between text-xs opacity-60">
          <span>{content.author || company}</span>
          <span>{brand.footerNote || "Document confidentiel"}</span>
        </footer>
      </section>

      {/* Sommaire + résumé */}
      <section className={`${paged ? "print-page" : ""} p-12`}>
        <SectionTitle brand={brand} index="—" title="Sommaire" />
        <ol className="mt-6 space-y-2">
          {content.sections.map((section, i) => (
            <li
              key={section.id}
              className="flex items-baseline justify-between gap-4 border-b pb-2 text-sm"
              style={{ borderColor: `${brand.primary}18` }}
            >
              <span>
                <span className="mr-3 tabular-nums opacity-50">{String(i + 1).padStart(2, "0")}</span>
                {section.title}
              </span>
            </li>
          ))}
        </ol>

        {content.executiveSummary ? (
          <div className="mt-12">
            <SectionTitle brand={brand} index="00" title="Résumé exécutif" />
            <p className="mt-4 text-[0.95rem] leading-[1.8]" style={{ color: `${brand.ink}E6` }}>
              {content.executiveSummary}
            </p>
          </div>
        ) : null}

        {content.highlights?.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {content.highlights.map((h, i) => (
              <div
                key={i}
                className="rounded-xl border p-4"
                style={{ borderColor: `${brand.primary}1F`, background: `${brand.accent}2E` }}
              >
                <p className="text-[0.68rem] font-medium uppercase tracking-wider opacity-60">{h.label}</p>
                <p className="mt-1 text-lg font-semibold" style={{ color: brand.primary }}>
                  {h.value}
                </p>
                {h.note ? <p className="mt-1 text-xs opacity-60">{h.note}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Sections */}
      {content.sections.map((section, i) => (
        <section key={section.id} className={`${paged ? "print-page" : ""} p-12`}>
          <SectionTitle brand={brand} index={String(i + 1).padStart(2, "0")} title={section.title} />
          {section.summary ? (
            <p className="mt-3 text-[0.95rem] italic leading-relaxed opacity-70">{section.summary}</p>
          ) : null}
          <div className="mt-4">
            {section.blocks.map((block, bi) => (
              <BlockRenderer
                key={bi}
                block={block}
                brand={palette}
                {...(content.currency ? { currency: content.currency } : {})}
              />
            ))}
          </div>
          <footer
            className="mt-10 flex justify-between border-t pt-3 text-[0.68rem] opacity-45"
            style={{ borderColor: `${brand.primary}18` }}
          >
            <span>{company || content.title}</span>
            <span>{i + 1}</span>
          </footer>
        </section>
      ))}
    </article>
  );
}

function SectionTitle({ brand, index, title }: { brand: Brand; index: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: brand.primary, fontFamily: `"${brand.fontDisplay}", sans-serif` }}
      >
        {index}
      </span>
      <h2
        className="text-2xl font-semibold"
        style={{ fontFamily: `"${brand.fontDisplay}", sans-serif`, color: brand.ink }}
      >
        {title}
      </h2>
    </div>
  );
}
