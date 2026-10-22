import { createFileRoute } from "@tanstack/react-router";
import { triggerChildHandshake } from "@/lib/child-handshake.server";
import { CORS_HEADERS } from "@/lib/claude-compat.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

export const Route = createFileRoute("/api/public/v1/workers/announce")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const isLocalDispatch = request.headers.get("x-child-auto-dispatch") === "1";
        const isParentDispatch =
          request.headers.get("x-parent-dispatch") === "snuggle-buddy-app-74";
        if (!isLocalDispatch && !isParentDispatch) return json({ error: "Unauthorized" }, 401);
        const callerOrigin = request.headers.get("origin");
        if (callerOrigin && callerOrigin !== new URL(request.url).origin)
          return json({ error: "Origin not allowed" }, 403);
        // A public header must never bypass the server's confirmed-registration cache.
        const res = await triggerChildHandshake(request.url, false);
        return json({
          ok: true,
          registered: res.registered,
          attempted: res.attempted,
          message: res.message,
        });
      },
    },
  },
});
