export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-12 w-12 text-xl" : size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${dim} grid place-items-center rounded-xl bg-primary font-display font-bold text-primary-foreground shadow-glow`}
        aria-hidden
      >
        K
      </div>
      <div className="leading-none">
        <div className={`${text} font-display font-bold tracking-tight`}>KOOKY</div>
        {size !== "sm" && <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Smart lead intelligence</div>}
      </div>
    </div>
  );
}
