import { createFileRoute } from "@tanstack/react-router";
import { handleAdminResource } from "@/lib/admin-resources.server";
export const Route = createFileRoute("/api/admin/usage")({
  server: {
    handlers: {
      GET: ({ request }) => handleAdminResource(request, "usage"),
      POST: ({ request }) => handleAdminResource(request, "usage"),
      PATCH: ({ request }) => handleAdminResource(request, "usage"),
    },
  },
});
