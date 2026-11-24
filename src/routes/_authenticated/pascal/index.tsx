import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pascal/")({
  beforeLoad: () => { throw redirect({ to: "/pascal/dashboard" }); },
});
