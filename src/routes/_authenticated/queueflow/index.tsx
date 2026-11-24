import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/queueflow/")({
  beforeLoad: () => { throw redirect({ to: "/queueflow/dashboard" }); },
});
