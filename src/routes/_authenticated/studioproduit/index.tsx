import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/studioproduit/")({
  beforeLoad: () => {
    throw redirect({ to: "/studioproduit/dashboard" });
  },
});
