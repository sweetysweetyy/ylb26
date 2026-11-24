import { Loader2, Sparkles, RotateCcw, Trash2, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Annotations, Section, SectionConfig } from "./types";

const SELECTS: { key: keyof SectionConfig; label: string; options: string[] }[] = [
  { key: "layout", label: "Disposition", options: ["auto", "centrée", "deux colonnes texte / visuel", "grille de cartes", "asymétrique", "plein écran immersif", "liste / timeline"] },
  { key: "background", label: "Fond", options: ["auto", "clair", "sombre", "couleur de marque", "dégradé", "image en fond"] },
  { key: "height", label: "Hauteur", options: ["auto", "compacte", "standard", "plein écran"] },
  { key: "animation", label: "Animation d'entrée", options: ["aucune", "fade-up", "fade-in", "zoom-in", "slide-left", "slide-right", "blur-in"] },
];
const TOGGLES: { key: keyof SectionConfig; label: string }[] = [
  { key: "stagger", label: "Apparition échelonnée" },
  { key: "hover", label: "Effets de survol" },
  { key: "float", label: "Éléments flottants" },
  { key: "marquee", label: "Bandeau défilant" },
];

export function Inspector({
  section, busy, onChange, onGenerate, onRegenerate, onUndo, onDelete, onClose,
}: {
  section: Section;
  busy: boolean;
  onChange: (patch: Partial<Section>) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onUndo: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const c = section.config ?? {};
  const ann: Annotations = section.annotations ?? { markers: [], strokes: [] };
  const setC = (patch: Partial<SectionConfig>) => onChange({ config: { ...c, ...patch } });
  const setAnn = (a: Annotations) => onChange({ annotations: a });
  const notes = ann.markers.length + ann.strokes.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Section</span>
        <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <Label>Titre</Label>
          <Input value={section.title} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Description détaillée</Label>
          <Textarea
            rows={5}
            placeholder="Ex : un hero avec un grand titre accrocheur, un sous-titre, deux boutons et une image produit à droite…"
            value={section.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SELECTS.map((s) => (
            <div key={s.key} className="space-y-1.5">
              <Label className="text-xs">{s.label}</Label>
              <select
                className="h-9 w-full rounded-md border bg-card px-2 text-sm"
                value={(c[s.key] as string) ?? s.options[0]}
                onChange={(e) => setC({ [s.key]: e.target.value })}
              >
                {s.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs">
              {t.label}
              <Switch checked={!!c[t.key]} onCheckedChange={(v) => setC({ [t.key]: v })} />
            </label>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Autres consignes</Label>
          <Input placeholder="Ex : ton chaleureux, 3 témoignages…" value={c.extra ?? ""} onChange={(e) => setC({ extra: e.target.value })} />
        </div>
        <Button className="w-full" variant={section.html ? "outline" : "default"} disabled={busy || !section.description.trim()} onClick={onGenerate}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {section.html ? "Générer à nouveau depuis la description" : "Générer la section"}
        </Button>

        {section.html && (
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <div>
              <p className="text-sm font-semibold">Modifications</p>
              <p className="text-xs text-muted-foreground">Placez des marqueurs ou dessinez sur la maquette (outils en haut de la carte), puis décrivez vos changements.</p>
            </div>
            {ann.markers.map((m, i) => (
              <NoteRow key={m.id} badge={`${i + 1}`} tone="marker" value={m.note}
                onChange={(note) => setAnn({ ...ann, markers: ann.markers.map((x) => (x.id === m.id ? { ...x, note } : x)) })}
                onRemove={() => setAnn({ ...ann, markers: ann.markers.filter((x) => x.id !== m.id) })} />
            ))}
            {ann.strokes.map((s, i) => (
              <NoteRow key={s.id} badge={`D${i + 1}`} tone="ink" value={s.note}
                onChange={(note) => setAnn({ ...ann, strokes: ann.strokes.map((x) => (x.id === s.id ? { ...x, note } : x)) })}
                onRemove={() => setAnn({ ...ann, strokes: ann.strokes.filter((x) => x.id !== s.id) })} />
            ))}
            <Textarea rows={2} placeholder="Demande globale (optionnelle)…" value={c.request ?? ""} onChange={(e) => setC({ request: e.target.value })} />
            <Button className="w-full" disabled={busy || (!notes && !c.request?.trim())} onClick={onRegenerate}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Régénérer avec mes indications
            </Button>
            {!!c.history?.length && (
              <Button variant="ghost" size="sm" className="w-full" onClick={onUndo} disabled={busy}>
                <RotateCcw className="h-3.5 w-3.5" /> Revenir à la version précédente
              </Button>
            )}
          </div>
        )}
        <button onClick={onDelete} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Supprimer la section
        </button>
      </div>
    </div>
  );
}

function NoteRow({ badge, tone, value, onChange, onRemove }: { badge: string; tone: "marker" | "ink"; value: string; onChange: (v: string) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[10px] font-bold text-primary-foreground ${tone === "marker" ? "bg-pw-marker" : "bg-pw-ink"}`}>{badge}</span>
      <Input className="h-8 text-sm" placeholder="Votre indication…" value={value} onChange={(e) => onChange(e.target.value)} />
      <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Retirer"><X className="h-4 w-4" /></button>
    </div>
  );
}
