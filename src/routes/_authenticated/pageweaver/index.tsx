import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pageweaver/")({
  beforeLoad: () => { throw redirect({ to: "/pageweaver/dashboard" }); },
});
