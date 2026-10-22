import { createFileRoute } from "@tanstack/react-router";
import { handleAdminResource } from "@/lib/admin-resources.server";
export const Route = createFileRoute("/api/admin/requests")({
  server: {
    handlers: {
      GET: ({ request }) => handleAdminResource(request, "requests"),
      POST: ({ request }) => handleAdminResource(request, "requests"),
      PATCH: ({ request }) => handleAdminResource(request, "requests"),
    },
  },
});
