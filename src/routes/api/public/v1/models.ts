/**
 * GET /api/public/v1/models
 *
 * Descoberta de modelos no formato OpenAI/Anthropic:
 * Inclui tanto os modelos nativos do gateway quanto os aliases do Claude Code.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  ALLOWED_MODELS,
  anthropicError,
  checkRateLimit,
  CORS_HEADERS,
  authenticateGatewayRequest,
  MODEL_ALIASES,
  rateLimitKey,
} from "@/lib/claude-compat.server";

export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const auth = await authenticateGatewayRequest(request);
        const bucket = auth.client ? `client:${auth.client.id}` : rateLimitKey(request);
        const rl = checkRateLimit(bucket, auth.client?.rate_limit_rpm || 120);
        if (!rl.ok) {
          return anthropicError(429, "rate_limit_error", "Limite de requisições atingido.", {
            "Retry-After": String(rl.retryAfter),
          });
        }
        if (!auth.authorized) {
          return anthropicError(
            401,
            "authentication_error",
            "Token inválido. Envie Authorization: Bearer <token> ou x-api-key.",
          );
        }

        const ids = Array.from(new Set([...ALLOWED_MODELS, ...Object.keys(MODEL_ALIASES)]));
        const permitted = auth.client?.allowed_models;
        const data = ids
          .filter((id) => !permitted?.length || permitted.includes(MODEL_ALIASES[id] ?? id))
          .map((id) => ({ id, object: "model" }));

        return new Response(JSON.stringify({ object: "list", data }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      },
    },
  },
});
