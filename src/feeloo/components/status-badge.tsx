import { cn } from "@/lib/utils";

export const CANDIDATE_STATUSES = [
  { value: "new", label: "Nouveau", tone: "bg-sky-500/15 text-sky-700 border-sky-500/30", available: true },
  { value: "screening", label: "En qualification", tone: "bg-amber-500/15 text-amber-700 border-amber-500/30", available: true },
  { value: "shortlisted", label: "Shortlisté", tone: "bg-violet-500/15 text-violet-700 border-violet-500/30", available: true },
  { value: "in_progress", label: "En cours", tone: "bg-orange-500/15 text-orange-700 border-orange-500/30", available: false },
  { value: "completed", label: "Terminé", tone: "bg-slate-500/15 text-slate-700 border-slate-500/30", available: false },
  { value: "hired", label: "Recruté", tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", available: false },
  { value: "rejected", label: "Rejeté", tone: "bg-rose-500/15 text-rose-700 border-rose-500/30", available: false },
  { value: "archived", label: "Archivé", tone: "bg-neutral-500/15 text-neutral-700 border-neutral-500/30", available: false },
] as const;

export const JOB_STATUSES = [
  { value: "open", label: "Ouvert", tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { value: "paused", label: "En pause", tone: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  { value: "filled", label: "Pourvu", tone: "bg-sky-500/15 text-sky-700 border-sky-500/30" },
  { value: "closed", label: "Clôturé", tone: "bg-neutral-500/15 text-neutral-700 border-neutral-500/30" },
] as const;

export function candidateStatus(value?: string | null) {
  return CANDIDATE_STATUSES.find((s) => s.value === value) ?? CANDIDATE_STATUSES[0];
}
export function jobStatus(value?: string | null) {
  return JOB_STATUSES.find((s) => s.value === value) ?? JOB_STATUSES[0];
}

export function StatusBadge({ label, tone, className }: { label: string; tone: string; className?: string }) {
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", tone, className)}>
      {label}
    </span>
  );
}
