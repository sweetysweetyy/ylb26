import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/coussel/")({
  beforeLoad: () => {
    throw redirect({ to: "/coussel/dashboard" });
  },
});
