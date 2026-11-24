import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dyap/")({
  beforeLoad: () => { throw redirect({ to: "/dyap/dashboard" }); },
});
