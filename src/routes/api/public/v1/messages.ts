/**
 * POST /api/public/v1/messages
 *
 * ⚠️ GATEWAY EXPERIMENTAL compatível com Claude Code (formato Anthropic
 * Messages API). Não é a API oficial da Anthropic: as chamadas são traduzidas
 * para o Lovable AI Gateway.
 *
 * Autenticação: `Authorization: Bearer <token>` ou `x-api-key: <token>`,
 * validados contra a secret CLAUDE_CODE_GATEWAY_TOKEN. O AI_CHAT_TEST_TOKEN
 * nunca é aceito neste endpoint.
 *
 * A LOVABLE_API_KEY é lida apenas dentro do handler e nunca é exposta ou logada.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  anthropicError,
  anthropicStream,
  checkRateLimit,
  consumeUpstream,
  CORS_HEADERS,
  EXPERIMENTAL_NOTICE,
  isAuthorized,
  MAX_BODY_BYTES,
  MAX_MESSAGES,
  MAX_TOTAL_CHARS,
  rateLimitKey,
  resolveModel,
  toAnthropicMessage,
  toChatCompletions,
  toResponsesRequest,
  type MessagesRequest,
} from "@/lib/claude-compat.server";

export const Route = createFileRoute("/api/public/v1/messages")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
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

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return anthropicError(413, "request_too_large", `Payload excede ${MAX_BODY_BYTES} bytes.`);
        }

        let body: MessagesRequest;
        try {
          body = JSON.parse(raw);
        } catch {
          return anthropicError(400, "invalid_request_error", "Corpo da requisição não é JSON válido.");
        }

        if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
          return anthropicError(400, "invalid_request_error", "`messages` é obrigatório e deve ser um array não vazio.");
        }
        if (body.messages.length > MAX_MESSAGES) {
          return anthropicError(400, "invalid_request_error", `Máximo de ${MAX_MESSAGES} mensagens por requisição.`);
        }
        for (const m of body.messages) {
          if (!m || (m.role !== "user" && m.role !== "assistant")) {
            return anthropicError(400, "invalid_request_error", "Cada mensagem precisa de role 'user' ou 'assistant'.");
          }
          if (typeof m.content !== "string" && !Array.isArray(m.content)) {
            return anthropicError(400, "invalid_request_error", "`content` deve ser string ou array de blocos.");
          }
        }
        if (JSON.stringify(body.messages).length > MAX_TOTAL_CHARS) {
          return anthropicError(413, "request_too_large", `Conteúdo total excede ${MAX_TOTAL_CHARS} caracteres.`);
        }
        if (body.max_tokens !== undefined && (typeof body.max_tokens !== "number" || body.max_tokens < 1)) {
          return anthropicError(400, "invalid_request_error", "`max_tokens` deve ser um número positivo.");
        }

        const model = resolveModel(body.model);
        if (!model) {
          return anthropicError(400, "invalid_request_error", `Modelo não permitido: ${String(body.model)}.`);
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return anthropicError(500, "api_error", "Serviço de IA indisponível.");
        }

        const isOpenAI = model.startsWith("openai/");
        const url = isOpenAI
          ? "https://ai.gateway.lovable.dev/v1/responses"
          : "https://ai.gateway.lovable.dev/v1/chat/completions";
        const payload = isOpenAI ? toResponsesRequest(body, model) : toChatCompletions(body, model);

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
          // log sem tokens nem headers
          console.error("[claude-compat] upstream unreachable", { model, stream: !!body.stream });
          return anthropicError(502, "api_error", "Não foi possível contatar o serviço de IA.");
        }

        if (!upstream.ok) {
          console.error("[claude-compat] upstream error", { model, status: upstream.status });
          if (upstream.status === 429)
            return anthropicError(429, "rate_limit_error", "Limite de requisições do provedor atingido.");
          if (upstream.status === 402)
            return anthropicError(402, "billing_error", "Créditos de IA esgotados.");
          return anthropicError(502, "api_error", "O serviço de IA retornou um erro.");
        }

        if (body.stream) return anthropicStream(model, upstream, isOpenAI);

        const acc = await consumeUpstream(upstream, isOpenAI);
        return new Response(
          JSON.stringify({ ...toAnthropicMessage(model, acc), notice: EXPERIMENTAL_NOTICE }),
          { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
        );
      },
    },
  },
});
