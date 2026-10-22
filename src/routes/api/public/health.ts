import { createFileRoute } from "@tanstack/react-router";

const startedAt = Date.now();

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const configured = {
          parentOrigin: Boolean(process.env["REMIX_SYNC_SECRET"]),
          pool: Boolean(process.env["POOL_SUPABASE_SERVICE_ROLE_KEY"]),
          aiGateway: Boolean(process.env["LOVABLE_API_KEY"]),
          admin: Boolean(process.env["CLAUDE_CODE_GATEWAY_TOKEN"]),
        };

        return new Response(
          JSON.stringify({
            ok: true,
            service: "snuggle-buddy-gateway",
            version: "parent-child-v2",
            uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
            configured,
            next: configured.aiGateway ? "ready-for-end-to-end-test" : "configure-ai-secret",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
