import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ecoflux/")({
  beforeLoad: () => { throw redirect({ to: "/ecoflux/dashboard" }); },
});
