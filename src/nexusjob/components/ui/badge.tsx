import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        holo: "border-transparent nxj-holo-gradient text-primary-foreground shadow-nxj-holo",
        "nxj-glass": "nxj-glass text-foreground border-white/50",
        live: "border-transparent bg-nxj-success/15 text-nxj-success gap-1.5 before:size-1.5 before:rounded-full before:bg-nxj-success before:nxj-animate-holo-pulse",
        accent: "border-transparent bg-accent/18 text-accent-foreground",
        soft: "border-transparent bg-nxj-holo-2/10 text-nxj-holo-2",
      },

    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
