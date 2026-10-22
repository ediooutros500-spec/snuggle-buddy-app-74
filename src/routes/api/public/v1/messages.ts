/**
 * POST /api/public/v1/messages
 *
 * Endpoint compatível com Claude Code / Anthropic Messages API.
 * Autentica via CLAUDE_CODE_GATEWAY_TOKEN ou chave de cliente emitida no Gateway.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  anthropicError,
  anthropicStream,
  authenticateGatewayRequest,
  consumeUpstream,
  CORS_HEADERS,
  EXPERIMENTAL_NOTICE,
  MAX_BODY_BYTES,
  MAX_MESSAGES,
  MAX_TOTAL_CHARS,
  toAnthropicMessage,
  toChatCompletions,
  toResponsesRequest,
  type MessagesRequest,
} from "@/lib/claude-compat.server";
import { fetchGatewayWithFailover } from "@/lib/key-pool.server";

import {
  admitModelAttempt,
  policyErrorResponse,
  readGatewaySettings,
  resolvePolicyModel,
} from "@/lib/gateway-policy.server";

import { withRequestTelemetry } from "@/lib/request-telemetry.server";

export const Route = createFileRoute("/api/public/v1/messages")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) =>
        withRequestTelemetry(request, "/api/public/v1/messages", async (trace) => {
          const auth = await authenticateGatewayRequest(request);
          trace.auth = auth;

          if (!auth.authorized) {
            return anthropicError(
              401,
              "authentication_error",
              "Token inválido. Envie Authorization: Bearer <token> ou x-api-key.",
            );
          }

          const raw = await request.text();
          if (raw.length > MAX_BODY_BYTES) {
            return anthropicError(
              413,
              "request_too_large",
              `Payload excede ${MAX_BODY_BYTES} bytes.`,
            );
          }

          let body: MessagesRequest;
          try {
            body = JSON.parse(raw);
          } catch {
            return anthropicError(
              400,
              "invalid_request_error",
              "Corpo da requisição não é JSON válido.",
            );
          }

          if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
            return anthropicError(
              400,
              "invalid_request_error",
              "`messages` é obrigatório e deve ser um array não vazio.",
            );
          }
          if (body.messages.length > MAX_MESSAGES) {
            return anthropicError(
              400,
              "invalid_request_error",
              `Máximo de ${MAX_MESSAGES} mensagens por requisição.`,
            );
          }
          for (const m of body.messages) {
            if (!m || (m.role !== "user" && m.role !== "assistant")) {
              return anthropicError(
                400,
                "invalid_request_error",
                "Cada mensagem precisa de role 'user' ou 'assistant'.",
              );
            }
            if (typeof m.content !== "string" && !Array.isArray(m.content)) {
              return anthropicError(
                400,
                "invalid_request_error",
                "`content` deve ser string ou array de blocos.",
              );
            }
          }
          if (JSON.stringify(body.messages).length > MAX_TOTAL_CHARS) {
            return anthropicError(
              413,
              "request_too_large",
              `Conteúdo total excede ${MAX_TOTAL_CHARS} caracteres.`,
            );
          }

          trace.requestedModel = body.model;
          let model: string;
          try {
            const settings = await readGatewaySettings();
            model = resolvePolicyModel(body.model, auth, settings);
            trace.model = model;
            await admitModelAttempt(model, auth, settings);
          } catch (error) {
            return policyErrorResponse(error);
          }

          const isOpenAI = model.startsWith("openai/");
          const url = isOpenAI
            ? "https://ai.gateway.lovable.dev/v1/responses"
            : "https://ai.gateway.lovable.dev/v1/chat/completions";
          const payload = isOpenAI
            ? toResponsesRequest(body, model)
            : toChatCompletions(body, model);

          const { upstream, networkError, workerKeyHint } = await fetchGatewayWithFailover(
            url,
            payload,
            3,
          );

          trace.workerKeyHint = workerKeyHint;

          if (networkError) {
            console.error("[claude-compat] upstream unreachable", { model, stream: !!body.stream });
            return anthropicError(502, "api_error", "Não foi possível contatar o serviço de IA.");
          }
          if (!upstream) {
            return anthropicError(
              500,
              "api_error",
              "Serviço de IA indisponível (sem chaves ativas no pool).",
            );
          }

          // Registrar métricas de telemetria se houver cliente
          if (!upstream.ok) {
            if (upstream.status === 429)
              return anthropicError(
                429,
                "rate_limit_error",
                "Limite de requisições do provedor atingido em todas as chaves do pool.",
              );
            if (upstream.status === 402)
              return anthropicError(402, "billing_error", "Créditos de IA esgotados.");
            return anthropicError(502, "api_error", "O serviço de IA retornou um erro.");
          }

          if (body.stream) {
            trace.streaming = true;
            return anthropicStream(model, upstream, isOpenAI, trace.finish);
          }

          const acc = await consumeUpstream(upstream, isOpenAI);
          trace.usage = acc;
          return new Response(
            JSON.stringify({ ...toAnthropicMessage(model, acc), notice: EXPERIMENTAL_NOTICE }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
          );
        }),
    },
  },
});
