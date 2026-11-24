import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export function BentoCard({ className, children, glow }: { className?: string; children: ReactNode; glow?: boolean }) {
  return (
    <div className={cn("relative rounded-3xl glass p-5 md:p-6", glow && "halo", className)}>
      {children}
    </div>
  );
}

export function StatBento({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon?: ReactNode }) {
  return (
    <BentoCard>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-4xl font-display font-semibold holo-text">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </div>
        {icon && <div className="size-10 rounded-xl holo-bg grid place-items-center text-white shadow">{icon}</div>}
      </div>
    </BentoCard>
  );
}