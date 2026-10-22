import { createFileRoute } from "@tanstack/react-router";
import {
  authorizeMedia,
  admitMediaModel,
  forwardMedia,
  jsonMedia,
  MEDIA_HEADERS,
  readJson,
  upstreamError,
} from "@/lib/media-gateway.server";
const MODELS = new Set(["openai/text-embedding-3-large", "openai/text-embedding-3-small"]);
import { withRequestTelemetry } from "@/lib/request-telemetry.server";

export const Route = createFileRoute("/api/public/v1/embeddings")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: MEDIA_HEADERS }),
      POST: async ({ request }) =>
        withRequestTelemetry(request, "/api/public/v1/embeddings", async (trace) => {
          const gate = await authorizeMedia(request);
          if (gate.response) return gate.response;
          trace.auth = gate.auth;
          const body = await readJson(request);
          if (!body)
            return jsonMedia(
              { error: { type: "invalid_request_error", message: "JSON inválido." } },
              400,
            );
          const model =
            typeof body["model"] === "string" ? body["model"] : "openai/text-embedding-3-small";
          if (!MODELS.has(model))
            return jsonMedia(
              {
                error: {
                  type: "invalid_request_error",
                  message: "Modelo de embedding não permitido.",
                },
              },
              400,
            );
          if (typeof body["input"] !== "string" && !Array.isArray(body["input"]))
            return jsonMedia(
              { error: { type: "invalid_request_error", message: "input é obrigatório." } },
              400,
            );
          trace.model = model;
          trace.requestedModel = body["model"];
          const denied = await admitMediaModel(gate, model);
          if (denied) return denied;
          const { upstream, networkError } = await forwardMedia(
            "https://ai.gateway.lovable.dev/v1/embeddings",
            { ...body, model },
          );
          if (!upstream?.ok) return upstreamError(upstream, networkError);
          trace.passThrough = true;
          return new Response(upstream.body, {
            status: upstream.status,
            headers: { "Content-Type": "application/json", ...MEDIA_HEADERS },
          });
        }),
    },
  },
});
