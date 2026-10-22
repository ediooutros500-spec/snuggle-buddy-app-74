/**
 * GET /api/public/v1/models
 *
 * Descoberta de modelos no formato OpenAI/Anthropic:
 * Inclui tanto os modelos nativos do gateway quanto os aliases do Claude Code.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  anthropicError,
  CORS_HEADERS,
  authenticateGatewayRequest,
  MODEL_ALIASES,
} from "@/lib/claude-compat.server";
import {
  enforcePolicyRate,
  MODEL_CATALOG,
  modelPermitted,
  policyErrorResponse,
  readGatewaySettings,
} from "@/lib/gateway-policy.server";

export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const auth = await authenticateGatewayRequest(request);
        if (!auth.authorized) {
          return anthropicError(
            401,
            "authentication_error",
            "Token inválido. Envie Authorization: Bearer <token> ou x-api-key.",
          );
        }

        let data;
        try {
          const settings = await readGatewaySettings();
          enforcePolicyRate(auth, settings);
          const ids = [...MODEL_CATALOG.map((x) => x.id), ...Object.keys(MODEL_ALIASES)];
          data = ids
            .filter((id) => modelPermitted(id, auth, settings))
            .map((id) => ({ id, object: "model" }));
        } catch (error) {
          return policyErrorResponse(error);
        }

        return new Response(JSON.stringify({ object: "list", data }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      },
    },
  },
});
