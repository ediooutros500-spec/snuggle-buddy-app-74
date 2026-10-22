import { randomUUID } from "node:crypto";
import { getPoolAdmin } from "./key-pool.server";
import type { Accumulated } from "./claude-compat.server";
import type { GatewayAuth } from "./gateway-policy.server";
export type RequestTrace = {
  auth?: GatewayAuth;
  model?: string;
  requestedModel?: unknown;
  workerKeyHint?: string | undefined;
  streaming?: boolean;
  passThrough?: boolean;
  usage?: Accumulated;
  finish: (acc: Accumulated | null, error?: boolean) => Promise<void>;
};
export async function withRequestTelemetry(
  request: Request,
  endpoint: string,
  handler: (trace: RequestTrace) => Promise<Response>,
): Promise<Response> {
  const id = randomUUID(),
    start = Date.now();
  let finished = false,
    status = 200;
  const trace: RequestTrace = {
    finish: async (acc, error = false) => {
      if (finished) return;
      finished = true;
      if (!trace.auth?.authorized) return;
      const pool = getPoolAdmin();
      if (!pool) return;
      try {
        const result = await pool.from("gateway_request_logs").insert({
          request_id: id,
          client_id: trace.auth.client?.id || null,
          client_name: trace.auth.client?.name || "Manutenção",
          endpoint,
          requested_model: String(trace.requestedModel || "default").slice(0, 200),
          resolved_model: trace.model || null,
          status_code: status,
          latency_ms: Date.now() - start,
          input_tokens: acc?.usageKnown ? acc.usage.input_tokens : null,
          output_tokens: acc?.usageKnown ? acc.usage.output_tokens : null,
          worker_key_hint: trace.workerKeyHint || null,
          error_message: error
            ? "Falha ao concluir resposta ou stream"
            : status >= 400
              ? `HTTP ${status}`
              : null,
        });
        if (result.error) console.warn("[gateway] request_log_write_failed", { requestId: id });
      } catch {
        console.warn("[gateway] request_log_write_failed", { requestId: id });
      }
    },
  };
  try {
    const response = await handler(trace);
    status = response.status;
    response.headers.set("X-Request-ID", id);
    response.headers.set("Access-Control-Expose-Headers", "X-Request-ID");
    if (trace.passThrough && response.body) {
      const reader = response.body.getReader();
      return new Response(
        new ReadableStream({
          async pull(controller) {
            try {
              const item = await reader.read();
              if (item.done) {
                await trace.finish(null);
                controller.close();
              } else controller.enqueue(item.value);
            } catch {
              await trace.finish(null, true);
              controller.error(new Error("Resposta interrompida"));
            }
          },
          async cancel(reason) {
            await reader.cancel(reason);
            await trace.finish(null, true);
          },
        }),
        { status, headers: response.headers },
      );
    }
    if (!trace.streaming) await trace.finish(trace.usage || null);
    return response;
  } catch {
    status = 503;
    await trace.finish(null, true);
    return new Response(
      JSON.stringify({
        error: { type: "api_error", message: "Não foi possível concluir a requisição." },
      }),
      {
        status,
        headers: {
          "content-type": "application/json",
          "X-Request-ID": id,
          "access-control-allow-origin": "*",
        },
      },
    );
  }
}
