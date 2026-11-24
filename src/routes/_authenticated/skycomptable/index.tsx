import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/skycomptable/")({
  beforeLoad: () => { throw redirect({ to: "/skycomptable/dashboard" }); },
});
