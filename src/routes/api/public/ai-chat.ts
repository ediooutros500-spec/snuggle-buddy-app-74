/**
 * POST /api/public/ai-chat
 *
 * Endpoint de chat de IA (Lovable AI Gateway).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  DEV ONLY — MODO DE TESTE COM BYPASS DE AUTENTICAÇÃO
 * ─────────────────────────────────────────────────────────────────────────────
 * Este arquivo contém um bypass de autenticação para testes externos, marcado
 * abaixo com o comentário "DEV ONLY — REMOVE BEFORE PRODUCTION".
 *
 * Como remover antes de produção:
 *   1. Apague o bloco marcado "DEV ONLY — REMOVE BEFORE PRODUCTION" (a função
 *      `isDevTestRequest` e a sua chamada dentro do handler).
 *   2. Apague a secret `AI_CHAT_TEST_TOKEN` no backend.
 *   3. Opcional: mova esta rota de `api/public/` para uma rota autenticada
 *      (ou para um `createServerFn` com `requireSupabaseAuth`).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A LOVABLE_API_KEY é lida SOMENTE dentro do handler e nunca é retornada,
 * logada ou exposta ao cliente.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const DEFAULT_MODEL = "google/gemini-3.6-flash";

/**
 * Allowlist configurável no backend.
 * - `google/*`  → POST /v1/chat/completions (formato `messages`)
 * - `openai/*`  → POST /v1/responses (Responses API, sempre em streaming)
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


const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_TOTAL_CHARS = 40_000;

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES),
  model: z.enum(ALLOWED_MODELS).optional(),
  system: z.string().max(MAX_MESSAGE_CHARS).optional(),
  stream: z.boolean().optional(),
});

const jsonError = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Comparação em tempo constante (evita timing attacks). */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ───────── DEV ONLY — REMOVE BEFORE PRODUCTION (início) ─────────
/**
 * Permite chamadas externas sem sessão quando o header
 * `x-ai-chat-test-token` for exatamente igual à secret AI_CHAT_TEST_TOKEN.
 * Se o header estiver ausente ou incorreto, a autenticação normal continua
 * valendo (ver `hasValidSession` no handler).
 */
function isDevTestRequest(request: Request): boolean {
  const provided = request.headers.get("x-ai-chat-test-token");
  const expected = process.env["AI_CHAT_TEST_TOKEN"];
  if (!provided || !expected) return false;
  return safeEqual(provided, expected);
}
// ───────── DEV ONLY — REMOVE BEFORE PRODUCTION (fim) ─────────

/** Autenticação normal: bearer token de sessão do backend. */
async function hasValidSession(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) return false;

  const url = process.env["SUPABASE_URL"];
  const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !publishableKey) return false;

  try {
    const client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("apikey", publishableKey);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const { data, error } = await client.auth.getUser(token);
    return !error && !!data.user;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/ai-chat")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers":
              "authorization, apikey, content-type, x-ai-chat-test-token",
          },
        }),

      POST: async ({ request }) => {
        // DEV ONLY — REMOVE BEFORE PRODUCTION: bypass por token de teste.
        const devTest = isDevTestRequest(request);

        if (!devTest && !(await hasValidSession(request))) {
          return jsonError(
            401,
            "unauthorized",
            "Autenticação obrigatória. Envie um bearer token de sessão válido.",
          );
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonError(400, "invalid_json", "Corpo da requisição não é um JSON válido.");
        }

        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return jsonError(
            400,
            "invalid_payload",
            parsed.error.issues
              .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
              .join("; "),
          );
        }

        const { messages, model, system, stream } = parsed.data;

        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
        if (totalChars > MAX_TOTAL_CHARS) {
          return jsonError(
            400,
            "payload_too_large",
            `Conteúdo total das mensagens excede ${MAX_TOTAL_CHARS} caracteres.`,
          );
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return jsonError(500, "server_misconfigured", "Serviço de IA indisponível.");
        }

        const selectedModel = model ?? DEFAULT_MODEL;
        const isOpenAI = selectedModel.startsWith("openai/");

        const finalMessages = system
          ? [{ role: "system" as const, content: system }, ...messages]
          : messages;

        let upstream: Response;
        try {
          upstream = isOpenAI
            ? // ── openai/* → Responses API (sempre streaming no upstream) ──
              await fetch("https://ai.gateway.lovable.dev/v1/responses", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Lovable-API-Key": apiKey,
                  "X-Lovable-AIG-SDK": "fetch",
                },
                body: JSON.stringify({
                  model: selectedModel,
                  ...(system ? { instructions: system } : {}),
                  input: messages.map((m) => ({
                    role: m.role,
                    content: [
                      {
                        type: m.role === "assistant" ? "output_text" : "input_text",
                        text: m.content,
                      },
                    ],
                  })),
                  stream: true,
                  store: false,
                }),
              })
            : // ── google/* (e demais) → Chat Completions ──
              await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Lovable-API-Key": apiKey,
                },
                body: JSON.stringify({
                  model: selectedModel,
                  messages: finalMessages,
                  stream: stream ?? false,
                }),
              });
        } catch {
          return jsonError(502, "upstream_unreachable", "Não foi possível contatar o serviço de IA.");
        }

        if (!upstream.ok) {
          if (upstream.status === 429) {
            return jsonError(429, "rate_limited", "Limite de requisições atingido. Tente novamente em instantes.");
          }
          if (upstream.status === 402) {
            return jsonError(402, "payment_required", "Créditos de IA esgotados.");
          }
          return jsonError(502, "upstream_error", "O serviço de IA retornou um erro.");
        }

        if (stream) {
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        const jsonOk = (payload: Record<string, unknown>) =>
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });

        if (isOpenAI) {
          // Consome o SSE da Responses API e devolve o texto final normalizado.
          const raw = await upstream.text();
          let content = "";
          let usage: unknown;

          for (const block of raw.split("\n\n")) {
            const line = block.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload) as {
                type?: string;
                delta?: string;
                response?: { output_text?: string; usage?: unknown };
              };
              if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
                content += evt.delta;
              } else if (evt.type === "response.completed" && evt.response) {
                if (evt.response.usage) usage = evt.response.usage;
                if (!content && typeof evt.response.output_text === "string") {
                  content = evt.response.output_text;
                }
              }
            } catch {
              // ignora eventos não-JSON
            }
          }

          return jsonOk({
            model: selectedModel,
            content,
            ...(usage ? { usage } : {}),
          });
        }

        const data = (await upstream.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: unknown;
        };

        return jsonOk({
          model: selectedModel,
          content: data.choices?.[0]?.message?.content ?? "",
          ...(data.usage ? { usage: data.usage } : {}),
        });
      },
    },
  },
});
