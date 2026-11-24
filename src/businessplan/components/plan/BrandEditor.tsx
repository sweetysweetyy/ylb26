import type { Brand } from "@/businessplan/lib/plan-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const COVERS: { id: Brand["cover"]; label: string }[] = [
  { id: "holographique", label: "Holographique" },
  { id: "sobre", label: "Sobre" },
  { id: "editorial", label: "Éditorial" },
];

const FONTS = ["Space Grotesk", "Inter", "Playfair Display", "DM Serif Display", "Manrope"];

export function BrandEditor({ brand, onChange }: { brand: Brand; onChange: (next: Brand) => void }) {
  const set = <K extends keyof Brand>(key: K, value: Brand[K]) => onChange({ ...brand, [key]: value });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField label="Couleur principale" value={brand.primary} onChange={(v) => set("primary", v)} />
        <ColorField label="Couleur d'accent" value={brand.accent} onChange={(v) => set("accent", v)} />
        <ColorField label="Texte" value={brand.ink} onChange={(v) => set("ink", v)} />
        <ColorField label="Fond des pages" value={brand.surface} onChange={(v) => set("surface", v)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Police des titres" value={brand.fontDisplay} options={FONTS} onChange={(v) => set("fontDisplay", v)} />
        <SelectField label="Police du texte" value={brand.fontBody} options={FONTS} onChange={(v) => set("fontBody", v)} />
      </div>

      <div className="space-y-1.5">
        <Label>Style de couverture</Label>
        <div className="flex gap-2">
          {COVERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => set("cover", c.id)}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                brand.cover === c.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="logo">Logo (URL)</Label>
          <Input id="logo" value={brand.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…/logo.png" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cname">Nom affiché</Label>
          <Input id="cname" value={brand.companyName ?? ""} onChange={(e) => set("companyName", e.target.value)} placeholder="Ma société" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="footer">Mention de bas de page</Label>
        <Input id="footer" value={brand.footerNote ?? ""} onChange={(e) => set("footerNote", e.target.value)} placeholder="Document confidentiel" />
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-xl border border-border px-2.5 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded-md border-0 bg-transparent p-0"
          aria-label={label}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
