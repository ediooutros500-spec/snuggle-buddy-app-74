import { createFileRoute } from "@tanstack/react-router";
import { handleAdminResource } from "@/lib/admin-resources.server";
export const Route = createFileRoute("/api/admin/clients")({
  server: {
    handlers: {
      GET: ({ request }) => handleAdminResource(request, "clients"),
      POST: ({ request }) => handleAdminResource(request, "clients"),
      PATCH: ({ request }) => handleAdminResource(request, "clients"),
    },
  },
});
