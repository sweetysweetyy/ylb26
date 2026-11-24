import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/financierplan/")({
  beforeLoad: () => {
    throw redirect({ to: "/financierplan/dashboard" });
  },
});
