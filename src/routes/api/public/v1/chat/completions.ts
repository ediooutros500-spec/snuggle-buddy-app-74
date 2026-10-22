/**
 * POST /api/public/v1/chat/completions
 *
 * Endpoint OpenAI-compatible com autenticação por chave de cliente ou admin.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateGatewayRequest,
  checkRateLimit,
  consumeUpstream,
  CORS_HEADERS,
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
import { fetchGatewayWithFailover, getPoolAdmin } from "@/lib/key-pool.server";

export const Route = createFileRoute("/api/public/v1/chat/completions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        const startTime = Date.now();
        const auth = await authenticateGatewayRequest(request);

        if (!auth.authorized) {
          return openaiError(
            401,
            "Token inválido. Envie Authorization: Bearer <token> ou x-api-key.",
            "invalid_api_key",
          );
        }

        const rpmLimit = auth.client?.rate_limit_rpm || 120;
        const rl = checkRateLimit(rateLimitKey(request), rpmLimit);
        if (!rl.ok) {
          return openaiError(429, "Limite de requisições atingido.", "rate_limit_exceeded", {
            "Retry-After": String(rl.retryAfter),
          });
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

        // Consultar modelos desabilitados globalmente
        const pool = getPoolAdmin();
        let disabledModels: string[] = [];
        if (pool) {
          const { data: setRow } = await pool
            .from("gateway_settings")
            .select("disabled_models")
            .eq("id", 1)
            .single();
          if (setRow?.disabled_models) disabledModels = setRow.disabled_models;
        }

        const model = resolveModel(body["model"], disabledModels);
        if (!model) {
          return openaiError(
            400,
            `Modelo não permitido ou desabilitado: ${String(body["model"])}.`,
            "model_not_found",
          );
        }

        if (auth.client?.allowed_models && auth.client.allowed_models.length > 0) {
          if (!auth.client.allowed_models.includes(model)) {
            return openaiError(
              403,
              "Seu cliente não possui permissão para usar este modelo.",
              "permission_denied",
            );
          }
        }

        const internal = toInternalRequest(body, model);
        const isOpenAI = model.startsWith("openai/");
        const url = isOpenAI
          ? "https://ai.gateway.lovable.dev/v1/responses"
          : "https://ai.gateway.lovable.dev/v1/chat/completions";
        const payload = isOpenAI
          ? toResponsesRequest(internal, model)
          : toChatCompletions(internal, model);

        const { upstream, networkError } = await fetchGatewayWithFailover(url, payload, 3);
        const latency = Date.now() - startTime;

        if (networkError) {
          console.error("[openai-compat] upstream unreachable", { model, stream: !!body.stream });
          return openaiError(502, "Não foi possível contatar o serviço de IA.", "api_error");
        }
        if (!upstream) {
          return openaiError(500, "Serviço de IA indisponível.", "api_error");
        }

        if (pool && auth.client) {
          pool
            .from("gateway_request_logs")
            .insert({
              client_id: auth.client.id,
              client_name: auth.client.name,
              endpoint: "/api/public/v1/chat/completions",
              requested_model: body["model"] || "default",
              resolved_model: model,
              status_code: upstream.status,
              latency_ms: latency,
            })
            .then(
              () => {},
              () => {},
            );
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
