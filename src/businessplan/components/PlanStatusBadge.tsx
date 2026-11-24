import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  uploaded: { label: "Importé", className: "bg-secondary text-secondary-foreground" },
  processing: { label: "Analyse en cours", className: "bg-accent text-accent-foreground animate-pulse" },
  ready: { label: "Prêt", className: "bg-primary text-primary-foreground" },
  error: { label: "Erreur", className: "bg-destructive text-destructive-foreground" },
};

export function PlanStatusBadge({ status }: { status: string }) {
  const item = MAP[status] ?? MAP["draft"]!;
  return <Badge className={`rounded-full border-0 ${item.className}`}>{item.label}</Badge>;
}
