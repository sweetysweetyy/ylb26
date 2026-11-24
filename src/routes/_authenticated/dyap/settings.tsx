import { createFileRoute } from "@tanstack/react-router";
import Configuration from "@/dyap/components/Configuration";

export const Route = createFileRoute("/_authenticated/dyap/settings")({ component: Configuration });
