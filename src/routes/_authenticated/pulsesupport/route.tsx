import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pulsesupport")({
  head: () => ({
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Figtree:wght@400;500;600&display=swap" }],
  }),
  component: () => (
    <div className="pulsesupport-theme min-h-screen">
      <Outlet />
    </div>
  ),
});
