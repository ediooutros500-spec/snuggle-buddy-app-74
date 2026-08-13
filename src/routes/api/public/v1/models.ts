/**
 * GET /api/public/v1/models
 *
 * Descoberta de modelos no formato OpenAI:
 * { "object": "list", "data": [{ "id": "...", "object": "model" }] }
 * Não expõe secrets, defaultModel, status ou aliases.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  ALLOWED_MODELS,
  anthropicError,
  checkRateLimit,
  CORS_HEADERS,
  isAuthorized,
  rateLimitKey,
} from "@/lib/claude-compat.server";


export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const rl = checkRateLimit(rateLimitKey(request));
        if (!rl.ok) {
          return anthropicError(429, "rate_limit_error", "Limite de requisições atingido.", {
            "Retry-After": String(rl.retryAfter),
          });
        }
        if (!isAuthorized(request)) {
          return anthropicError(
            401,
            "authentication_error",
            "Token inválido. Envie Authorization: Bearer <token> ou x-api-key.",
          );
        }

        const data = ALLOWED_MODELS.map((id) => ({ id, object: "model" }));

        return new Response(JSON.stringify({ object: "list", data }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      },
    },
  },
});
