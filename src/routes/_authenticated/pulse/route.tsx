import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pulse")({
  head: () => ({
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&family=JetBrains+Mono&display=swap" }],
  }),
  component: () => (
    <div className="pulse-theme min-h-screen">
      <Outlet />
    </div>
  ),
});
