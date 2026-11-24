export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="3" y="4" width="18" height="5" rx="1.5" />
          <rect x="3" y="11" width="10" height="9" rx="1.5" />
          <circle cx="18" cy="16" r="3" className="fill-accent stroke-accent" />
        </svg>
      </div>
      {!compact && <span className="font-pw-display text-lg font-bold">Maquettiste</span>}
    </div>
  );
}
