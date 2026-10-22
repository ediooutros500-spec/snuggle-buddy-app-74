import { createFileRoute } from "@tanstack/react-router";
import { handleAdminResource } from "@/lib/admin-resources.server";
export const Route = createFileRoute("/api/admin/system")({
  server: {
    handlers: {
      GET: ({ request }) => handleAdminResource(request, "system"),
      POST: ({ request }) => handleAdminResource(request, "system"),
      PATCH: ({ request }) => handleAdminResource(request, "system"),
    },
  },
});
