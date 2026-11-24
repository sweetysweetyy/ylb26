import { motion } from "motion/react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-7 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="font-display text-3xl font-bold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-foreground/70">{subtitle}</p>}
      </div>
      {action}
    </motion.header>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">{children}</div>;
}
