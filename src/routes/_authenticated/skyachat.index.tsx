import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/skyachat/")({
  beforeLoad: () => {
    throw redirect({ to: "/skyachat/dashboard" });
  },
});
