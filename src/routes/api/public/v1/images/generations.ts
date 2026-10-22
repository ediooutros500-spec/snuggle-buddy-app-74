import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS } from "@/lib/claude-compat.server";
import {
  authorizeMedia,
  forwardMedia,
  jsonMedia,
  MEDIA_HEADERS,
  readJson,
  upstreamError,
} from "@/lib/media-gateway.server";
const MODELS = new Set(["openai/gpt-image-2.5-sunburst", "openai/gpt-image-2.5-flare"]);
export const Route = createFileRoute("/api/public/v1/images/generations")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: MEDIA_HEADERS }),
      POST: async ({ request }) => {
        const gate = await authorizeMedia(request);
        if (gate.response) return gate.response;
        const body = await readJson(request);
        if (!body)
          return jsonMedia(
            { error: { type: "invalid_request_error", message: "JSON inválido." } },
            400,
          );
        const model =
          typeof body["model"] === "string" ? body["model"] : "openai/gpt-image-2.5-sunburst";
        if (!MODELS.has(model))
          return jsonMedia(
            {
              error: { type: "invalid_request_error", message: "Modelo de imagem não permitido." },
            },
            400,
          );
        const { upstream, networkError } = await forwardMedia(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          { ...body, model },
        );
        if (!upstream?.ok) return upstreamError(upstream, networkError);
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "application/json",
            ...CORS_HEADERS,
          },
        });
      },
    },
  },
});
