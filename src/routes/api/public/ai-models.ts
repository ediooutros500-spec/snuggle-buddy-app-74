/**
 * GET /api/public/ai-models
 *
 * Retorna a allowlist explícita de modelos permitidos neste projeto,
 * incluindo o modelo padrão e o status de disponibilidade de cada um.
 *
 * A LOVABLE_API_KEY é lida SOMENTE dentro do handler e nunca é retornada,
 * logada ou exposta ao cliente.
 */
import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_MODEL = "google/gemini-3.6-flash";

/**
 * Allowlist configurável no backend. Apenas modelos listados aqui são
 * expostos e podem ser usados pelos endpoints de IA deste projeto.
 * - `google/*` → /v1/chat/completions
 * - `openai/*` → /v1/responses (streaming)
 */
const ALLOWED_MODELS = [
  "google/gemini-3.6-flash",
  "google/gemini-3.5-flash",
  "google/gemini-3.1-flash-lite",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
  "openai/gpt-5.5",
  "openai/gpt-5.5-pro",
] as const;

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

const jsonError = (status: number, code: string, message: string) =>
  jsonResponse(status, { error: { code, message } });

/**
 * Testa um modelo contra o Lovable AI Gateway com uma requisição mínima,
 * usando o protocolo correto para cada família:
 *  - `openai/*` → POST /v1/responses (streaming obrigatório)
 *  - demais      → POST /v1/chat/completions
 * O gateway não expõe um endpoint de catálogo oficial, então verificamos
 * empiricamente quais modelos respondem com sucesso. Sem timeouts artificiais.
 */
async function probeModel(
  model: string,
  apiKey: string,
): Promise<{ status: "available" | "unavailable"; error?: string }> {
  const isOpenAI = model.startsWith("openai/");

  try {
    const upstream = isOpenAI
      ? await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model,
            input: "oi",
            stream: true,
            store: false,
          }),
        })
      : await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "oi" }],
          }),
        });

    if (!upstream.ok) {
      let detail = `HTTP ${upstream.status}`;
      try {
        const err = (await upstream.json()) as { error?: { message?: string } };
        if (err.error?.message) detail = err.error.message;
      } catch {
        // mantém o status HTTP como detalhe
      }
      return { status: "unavailable", error: detail };
    }

    if (isOpenAI) {
      // Consome o SSE até o fim: sucesso quando houver texto ou `response.completed`.
      const raw = await upstream.text();
      const ok = raw.includes("response.output_text.delta") || raw.includes("response.completed");
      if (!ok) {
        return { status: "unavailable", error: "Stream do gateway sem resposta final." };
      }
      return { status: "available" };
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!data.choices || data.choices.length === 0) {
      return { status: "unavailable", error: "Resposta do gateway sem choices." };
    }

    return { status: "available" };
  } catch (err) {
    return {
      status: "unavailable",
      error: err instanceof Error ? err.message : "Erro desconhecido.",
    };
  }
}

export const Route = createFileRoute("/api/public/ai-models")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "apikey, content-type",
          },
        }),

      GET: async () => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return jsonError(500, "server_misconfigured", "Serviço de IA indisponível.");
        }

        const results = await Promise.all(
          ALLOWED_MODELS.map(async (id) => {
            const probe = await probeModel(id, apiKey);
            return {
              id,
              status: probe.status,
              ...(probe.error ? { error: probe.error } : {}),
            };
          }),
        );

        return jsonResponse(200, {
          defaultModel: DEFAULT_MODEL,
          models: results,
        });
      },
    },
  },
});
