import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/caisse/")({
  beforeLoad: () => { throw redirect({ to: "/caisse/dashboard" }); },
});
