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
const MODELS = new Set([
  "google/veo-3.1",
  "google/veo-3.1-fast",
  "google/veo-3.1-lite",
  "google/gemini-omni-1.1-flash",
]);
import { withRequestTelemetry } from "@/lib/request-telemetry.server";

export const Route = createFileRoute("/api/public/v1/videos/generations")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: MEDIA_HEADERS }),
      POST: async ({ request }) =>
        withRequestTelemetry(request, "/api/public/v1/videos/generations", async (trace) => {
          const gate = await authorizeMedia(request);
          if (gate.response) return gate.response;
          trace.auth = gate.auth;
          const body = await readJson(request);
          if (!body)
            return jsonMedia(
              { error: { type: "invalid_request_error", message: "JSON inválido." } },
              400,
            );
          const model = typeof body["model"] === "string" ? body["model"] : "google/veo-3.1-fast";
          if (!MODELS.has(model))
            return jsonMedia(
              {
                error: { type: "invalid_request_error", message: "Modelo de vídeo não permitido." },
              },
              400,
            );
          trace.model = model;
          trace.requestedModel = body["model"];
          const denied = await admitMediaModel(gate, model);
          if (denied) return denied;
          const { upstream, networkError } = await forwardMedia(
            "https://ai.gateway.lovable.dev/v1/videos/generations",
            { ...body, model },
          );
          if (!upstream?.ok) return upstreamError(upstream, networkError);
          trace.passThrough = true;
          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("content-type") ?? "application/json",
              ...MEDIA_HEADERS,
            },
          });
        }),
    },
  },
});
