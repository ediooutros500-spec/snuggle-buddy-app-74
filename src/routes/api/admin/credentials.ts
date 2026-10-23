import { createFileRoute } from "@tanstack/react-router";
import { handleAdminResource } from "@/lib/admin-resources.server";
export const Route = createFileRoute("/api/admin/credentials")({
  server: {
    handlers: {
      GET: ({ request }) => handleAdminResource(request, "credentials"),
      POST: ({ request }) => handleAdminResource(request, "credentials"),
      PATCH: ({ request }) => handleAdminResource(request, "credentials"),
      DELETE: ({ request }) => handleAdminResource(request, "credentials"),
    },
  },
});
