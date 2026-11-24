import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/odooweb/")({
  beforeLoad: () => { throw redirect({ to: "/odooweb/dashboard" }); },
});
