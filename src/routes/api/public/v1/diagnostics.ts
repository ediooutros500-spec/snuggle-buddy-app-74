/**
 * GET /api/public/v1/diagnostics
 *
 * Diagnóstico protegido do gateway experimental compatível com Claude Code.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  ALLOWED_MODELS,
  anthropicError,
  checkRateLimit,
  CORS_HEADERS,
  DEFAULT_MODEL,
  EXPERIMENTAL_NOTICE,
  isAuthorized,
  MAX_BODY_BYTES,
  MAX_MESSAGES,
  rateLimitKey,
} from "@/lib/claude-compat.server";
import { getPoolAdmin } from "@/lib/key-pool.server";

export const Route = createFileRoute("/api/public/v1/diagnostics")({
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

        const pool = getPoolAdmin();

        return new Response(
          JSON.stringify({
            secrets: {
              LOVABLE_API_KEY: { configured: Boolean(process.env["LOVABLE_API_KEY"]) },
              CLAUDE_CODE_GATEWAY_TOKEN: {
                configured: Boolean(process.env["CLAUDE_CODE_GATEWAY_TOKEN"]),
              },
              POOL_SUPABASE_SERVICE_ROLE_KEY: {
                configured: Boolean(process.env["POOL_SUPABASE_SERVICE_ROLE_KEY"]),
              },
            },
            pool_connected: Boolean(pool),
            routes: [
              "POST /api/public/v1/messages",
              "POST /api/public/v1/chat/completions",
              "POST /api/public/v1/workers/register",
              "GET /api/public/v1/models",
              "GET /api/public/v1/diagnostics",
            ],
            default_model: DEFAULT_MODEL,
            models_count: ALLOWED_MODELS.length,
            limits: { max_body_bytes: MAX_BODY_BYTES, max_messages: MAX_MESSAGES },
            notice: EXPERIMENTAL_NOTICE,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
        );
      },
    },
  },
});
