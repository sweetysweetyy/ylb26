import { FileScan } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-2 font-fo-display text-lg font-bold ${light ? "text-sidebar-foreground" : ""}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-fo-copper text-fo-copper-foreground">
        <FileScan className="size-4.5" />
      </span>
      Factur<span className="text-fo-copper">Odoo</span>
    </div>
  );
}
