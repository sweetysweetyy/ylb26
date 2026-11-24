import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/cml/")({ beforeLoad: () => { throw redirect({ to: "/cml/dashboard" }); } });
