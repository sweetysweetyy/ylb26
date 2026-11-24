import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pageweaver")({
  head: () => ({
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Instrument+Sans:wght@400;500;600;700&display=swap" }],
  }),
  component: () => (
    <div className="pageweaver-theme min-h-screen">
      <Outlet />
    </div>
  ),
});
