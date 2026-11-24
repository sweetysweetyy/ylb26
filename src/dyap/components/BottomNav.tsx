import { Home, RefreshCw, Presentation, FolderOpen, Settings } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dyap/dashboard", icon: Home, label: "Accueil" },
  { to: "/dyap/update", icon: RefreshCw, label: "Update" },
  { to: "/dyap/create", icon: Presentation, label: "Créer", isCenter: true },
  { to: "/dyap/mediatech", icon: FolderOpen, label: "MediaTech" },
  { to: "/dyap/settings", icon: Settings, label: "Config" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-xl nav-bottom-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          const isCenter = "isCenter" in item;
          return (
            <Link key={item.to} to={item.to} className={cn("flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-all duration-200", isCenter && "relative -top-3", isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              {isCenter ? (
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300", isActive ? "bg-gradient-mixed glow-cyan" : "bg-muted hover:bg-muted/80")}>
                  <item.icon className={cn("h-6 w-6", isActive ? "text-primary-foreground" : "text-foreground")} />
                </div>
              ) : (
                <item.icon className="h-5 w-5" />
              )}
              <span className={cn(isCenter && "mt-1")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
