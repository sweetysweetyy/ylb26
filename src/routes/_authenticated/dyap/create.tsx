import { createFileRoute } from "@tanstack/react-router";
import Create from "@/dyap/components/Create";

export const Route = createFileRoute("/_authenticated/dyap/create")({ component: Create });
