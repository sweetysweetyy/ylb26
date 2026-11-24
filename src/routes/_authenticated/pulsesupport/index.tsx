import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pulsesupport/")({
  beforeLoad: () => {
    throw redirect({ to: "/pulsesupport/dashboard" });
  },
});
