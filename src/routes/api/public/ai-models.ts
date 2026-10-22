import { createFileRoute } from "@tanstack/react-router";
import { MODEL_CATALOG } from "@/lib/gateway-policy.server";
export const Route = createFileRoute("/api/public/ai-models")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify(
            process.env["GATEWAY_ROLE"] === "central"
              ? {
                  error: {
                    code: "legacy_route_disabled",
                    message: "Use /v1/models com uma chave de cliente.",
                  },
                }
              : { models: MODEL_CATALOG.map((model) => ({ ...model, status: "unverified" })) },
          ),
          {
            status: process.env["GATEWAY_ROLE"] === "central" ? 410 : 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
              "access-control-allow-origin": "*",
            },
          },
        ),
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
          },
        }),
    },
  },
});
