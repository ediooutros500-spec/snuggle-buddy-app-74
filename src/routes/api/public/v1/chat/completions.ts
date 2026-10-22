/**
 * POST /api/public/v1/chat/completions
 *
 * Endpoint OpenAI-compatible com autenticação por chave de cliente ou admin.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateGatewayRequest,
  consumeUpstream,
  CORS_HEADERS,
  MAX_BODY_BYTES,
  MAX_MESSAGES,
  MAX_TOTAL_CHARS,
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
import { fetchGatewayWithFailover } from "@/lib/key-pool.server";

import {
  admitModelAttempt,
  policyErrorResponse,
  readGatewaySettings,
  resolvePolicyModel,
} from "@/lib/gateway-policy.server";

import { withRequestTelemetry } from "@/lib/request-telemetry.server";

export const Route = createFileRoute("/api/public/v1/chat/completions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) =>
        withRequestTelemetry(request, "/api/public/v1/chat/completions", async (trace) => {
          const auth = await authenticateGatewayRequest(request);
          trace.auth = auth;

          if (!auth.authorized) {
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
            return openaiError(
              400,
              "Corpo da requisição não é JSON válido.",
              "invalid_request_error",
            );
          }

          if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
            return openaiError(
              400,
              "`messages` é obrigatório e deve ser um array não vazio.",
              "invalid_request_error",
            );
          }
          if (body.messages.length > MAX_MESSAGES) {
            return openaiError(
              400,
              `Máximo de ${MAX_MESSAGES} mensagens por requisição.`,
              "invalid_request_error",
            );
          }
          if (JSON.stringify(body.messages).length > MAX_TOTAL_CHARS) {
            return openaiError(
              413,
              `Conteúdo total excede ${MAX_TOTAL_CHARS} caracteres.`,
              "request_too_large",
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

          const internal = toInternalRequest(body, model);
          const isOpenAI = model.startsWith("openai/");
          const url = isOpenAI
            ? "https://ai.gateway.lovable.dev/v1/responses"
            : "https://ai.gateway.lovable.dev/v1/chat/completions";
          const payload = isOpenAI
            ? toResponsesRequest(internal, model)
            : toChatCompletions(internal, model);

          const { upstream, networkError, workerKeyHint } = await fetchGatewayWithFailover(
            url,
            payload,
            3,
          );

          trace.workerKeyHint = workerKeyHint;

          if (networkError) {
            console.error("[openai-compat] upstream unreachable", { model, stream: !!body.stream });
            return openaiError(502, "Não foi possível contatar o serviço de IA.", "api_error");
          }
          if (!upstream) {
            return openaiError(500, "Serviço de IA indisponível.", "api_error");
          }

          if (!upstream.ok) {
            if (upstream.status === 429)
              return openaiError(
                429,
                "Limite de requisições do provedor atingido em todas as chaves do pool.",
                "rate_limit_exceeded",
              );
            if (upstream.status === 402)
              return openaiError(402, "Créditos de IA esgotados.", "insufficient_quota");
            return openaiError(502, "O serviço de IA retornou um erro.", "api_error");
          }

          if (body.stream) {
            trace.streaming = true;
            return openaiStream(model, upstream, isOpenAI, trace.finish);
          }

          const acc = await consumeUpstream(upstream, isOpenAI);
          trace.usage = acc;
          return new Response(JSON.stringify(toChatCompletion(model, acc)), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }),
    },
  },
});
