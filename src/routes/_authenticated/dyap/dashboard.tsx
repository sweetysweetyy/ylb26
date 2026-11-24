import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/dyap/components/Dashboard";

export const Route = createFileRoute("/_authenticated/dyap/dashboard")({ component: Dashboard });
