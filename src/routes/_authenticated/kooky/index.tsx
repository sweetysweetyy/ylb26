import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/kooky/")({
  beforeLoad: () => { throw redirect({ to: "/kooky/dashboard" }); },
});
