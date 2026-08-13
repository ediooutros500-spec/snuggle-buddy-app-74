/**
 * POST /api/public/v1/chat/completions
 *
 * ⚠️ GATEWAY EXPERIMENTAL compatível com a OpenAI Chat Completions API.
 * Autenticação: `Authorization: Bearer <CLAUDE_CODE_GATEWAY_TOKEN>` ou
 * `x-api-key`. A LOVABLE_API_KEY é lida apenas no backend e nunca exposta.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  checkRateLimit,
  consumeUpstream,
  CORS_HEADERS,
  isAuthorized,
  MAX_BODY_BYTES,
  MAX_MESSAGES,
  MAX_TOTAL_CHARS,
  rateLimitKey,
  resolveModel,
  toChatCompletions,
  toResponsesRequest,
} from "@/lib/claude-compat.server";
import {
  openaiError,
  openaiStream,
  toChatCompletion,
  toInternalRequest,
  type OpenAIChatRequest,
} from "@/lib/openai-compat.server";

export const Route = createFileRoute("/api/public/v1/chat/completions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        const rl = checkRateLimit(rateLimitKey(request));
        if (!rl.ok) {
          return openaiError(429, "Limite de requisições atingido.", "rate_limit_exceeded", {
            "Retry-After": String(rl.retryAfter),
          });
        }
        if (!isAuthorized(request)) {
          return openaiError(
            401,
            "Token inválido. Envie Authorization: Bearer <token> ou x-api-key.",
            "invalid_api_key",
          );
        }

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return openaiError(413, `Payload excede ${MAX_BODY_BYTES} bytes.`, "request_too_large");
        }

        let body: OpenAIChatRequest;
        try {
          body = JSON.parse(raw);
        } catch {
          return openaiError(400, "Corpo da requisição não é JSON válido.", "invalid_request_error");
        }

        if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
          return openaiError(400, "`messages` é obrigatório e deve ser um array não vazio.", "invalid_request_error");
        }
        if (body.messages.length > MAX_MESSAGES) {
          return openaiError(400, `Máximo de ${MAX_MESSAGES} mensagens por requisição.`, "invalid_request_error");
        }
        if (JSON.stringify(body.messages).length > MAX_TOTAL_CHARS) {
          return openaiError(413, `Conteúdo total excede ${MAX_TOTAL_CHARS} caracteres.`, "request_too_large");
        }

        const model = resolveModel(body.model);
        if (!model) {
          return openaiError(400, `Modelo não permitido: ${String(body.model)}.`, "model_not_found");
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return openaiError(500, "Serviço de IA indisponível.", "api_error");

        const internal = toInternalRequest(body, model);
        const isOpenAI = model.startsWith("openai/");
        const url = isOpenAI
          ? "https://ai.gateway.lovable.dev/v1/responses"
          : "https://ai.gateway.lovable.dev/v1/chat/completions";
        const payload = isOpenAI
          ? toResponsesRequest(internal, model)
          : toChatCompletions(internal, model);

        let upstream: Response;
        try {
          upstream = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify(payload),
          });
        } catch {
          console.error("[openai-compat] upstream unreachable", { model, stream: !!body.stream });
          return openaiError(502, "Não foi possível contatar o serviço de IA.", "api_error");
        }

        if (!upstream.ok) {
          console.error("[openai-compat] upstream error", { model, status: upstream.status });
          if (upstream.status === 429)
            return openaiError(429, "Limite de requisições do provedor atingido.", "rate_limit_exceeded");
          if (upstream.status === 402) return openaiError(402, "Créditos de IA esgotados.", "insufficient_quota");
          return openaiError(502, "O serviço de IA retornou um erro.", "api_error");
        }

        if (body.stream) return openaiStream(model, upstream, isOpenAI);

        const acc = await consumeUpstream(upstream, isOpenAI);
        return new Response(JSON.stringify(toChatCompletion(model, acc)), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      },
    },
  },
});
