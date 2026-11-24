import { createFileRoute } from "@tanstack/react-router";
import MediaTech from "@/dyap/components/MediaTech";

export const Route = createFileRoute("/_authenticated/dyap/mediatech")({ component: MediaTech });
