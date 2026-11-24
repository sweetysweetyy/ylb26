import { createFileRoute } from "@tanstack/react-router";
import Update from "@/dyap/components/Update";

export const Route = createFileRoute("/_authenticated/dyap/update")({ component: Update });
