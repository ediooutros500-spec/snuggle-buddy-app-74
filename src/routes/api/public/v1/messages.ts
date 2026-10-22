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
  checkRateLimit,
  consumeUpstream,
  CORS_HEADERS,
  EXPERIMENTAL_NOTICE,
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
import { fetchGatewayWithFailover, getPoolAdmin } from "@/lib/key-pool.server";

export const Route = createFileRoute("/api/public/v1/messages")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        const startTime = Date.now();
        const auth = await authenticateGatewayRequest(request);

        if (!auth.authorized) {
          return anthropicError(
            401,
            "authentication_error",
            "Token inválido. Envie Authorization: Bearer <token> ou x-api-key.",
          );
        }

        const rpmLimit = auth.client?.rate_limit_rpm || 120;
        const rl = checkRateLimit(rateLimitKey(request), rpmLimit);
        if (!rl.ok) {
          return anthropicError(429, "rate_limit_error", "Limite de requisições atingido.", {
            "Retry-After": String(rl.retryAfter),
          });
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
          return anthropicError(
            400,
            "invalid_request_error",
            `Modelo não permitido ou desabilitado pelo administrador: ${String(body["model"])}.`,
          );
        }

        // Confere permissão do cliente
        if (auth.client?.allowed_models && auth.client.allowed_models.length > 0) {
          if (!auth.client.allowed_models.includes(model)) {
            return anthropicError(
              403,
              "permission_error",
              "Seu cliente não tem permissão para usar este modelo.",
            );
          }
        }

        const isOpenAI = model.startsWith("openai/");
        const url = isOpenAI
          ? "https://ai.gateway.lovable.dev/v1/responses"
          : "https://ai.gateway.lovable.dev/v1/chat/completions";
        const payload = isOpenAI ? toResponsesRequest(body, model) : toChatCompletions(body, model);

        const { upstream, networkError } = await fetchGatewayWithFailover(url, payload, 3);
        const latency = Date.now() - startTime;

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
        if (pool && auth.client) {
          pool
            .rpc("increment_client_stats", {
              p_client_id: auth.client.id,
              p_reqs: 1,
              p_in_tok: 0,
              p_out_tok: 0,
            })
            .then(
              () => {},
              () => {},
            );

          pool
            .from("gateway_request_logs")
            .insert({
              client_id: auth.client.id,
              client_name: auth.client.name,
              endpoint: "/api/public/v1/messages",
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
            return anthropicError(
              429,
              "rate_limit_error",
              "Limite de requisições do provedor atingido em todas as chaves do pool.",
            );
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
