import { createFileRoute } from "@tanstack/react-router";
import { maybeAutoRegisterChild } from "@/lib/key-pool.server";
import { CORS_HEADERS } from "@/lib/claude-compat.server";

export const Route = createFileRoute("/api/public/v1/workers/announce")({ server: { handlers: {
  OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
  POST: async ({ request }) => {
    if (request.headers.get("x-parent-dispatch") !== "snuggle-buddy-app-74") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    await maybeAutoRegisterChild(request.url);
    return new Response(JSON.stringify({ ok: true, message: "Child sync dispatched" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  },
} } });
