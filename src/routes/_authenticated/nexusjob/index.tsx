import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/nexusjob/")({
  beforeLoad: () => {
    throw redirect({ to: "/nexusjob/dashboard" });
  },
});
