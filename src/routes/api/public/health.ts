import { createFileRoute } from "@tanstack/react-router";

const startedAt = Date.now();
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            service: "gateway-parent",
            role: process.env["GATEWAY_ROLE"] === "central" ? "central" : "child",
            uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
          }),
          { headers: { "content-type": "application/json", "cache-control": "no-store" } },
        ),
    },
  },
});
