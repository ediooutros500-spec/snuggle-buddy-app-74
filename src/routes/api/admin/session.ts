import { createFileRoute } from "@tanstack/react-router";
import { handleAdminSession } from "@/lib/admin-auth.server";

export const Route = createFileRoute("/api/admin/session")({
  server: {
    handlers: {
      GET: ({ request }) => handleAdminSession(request),
      POST: ({ request }) => handleAdminSession(request),
      DELETE: ({ request }) => handleAdminSession(request),
    },
  },
});
