import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 72,
  label = "match",
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const tone = clamped >= 80 ? "var(--success)" : clamped >= 55 ? "var(--holo-1)" : "var(--holo-4)";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={6}
          stroke="oklch(0.28 0.07 250 / 0.14)"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          stroke={tone}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display font-bold leading-none")} style={{ fontSize: size / 3.4 }}>
          {clamped}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
