/**
 * Camada de compatibilidade com a Anthropic Messages API (Claude Code).
 *
 * ⚠️ GATEWAY EXPERIMENTAL — não é a API oficial da Anthropic. Este projeto
 * traduz requisições no formato Anthropic para o Lovable AI Gateway
 * (`google/*` via /v1/chat/completions, `openai/*` via /v1/responses).
 *
 * A LOVABLE_API_KEY é lida SOMENTE dentro dos handlers e nunca é retornada,
 * logada ou exposta. Nenhum log inclui tokens ou headers de autenticação.
 */

export const EXPERIMENTAL_NOTICE =
  "Gateway experimental compatível com Claude Code. Não é a API oficial da Anthropic; " +
  "as requisições são traduzidas para o Lovable AI Gateway.";

export const DEFAULT_MODEL = "google/gemini-3.6-flash";

/** Allowlist configurável no backend. */
export const ALLOWED_MODELS = [
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

/** Nomes estilo Claude Code mapeados para modelos reais do gateway. */
export const MODEL_ALIASES: Record<string, string> = {
  "claude-3-5-haiku": "google/gemini-3.6-flash",
  "claude-3-5-haiku-latest": "google/gemini-3.6-flash",
  "claude-3-5-sonnet": "openai/gpt-5.6-terra",
  "claude-3-5-sonnet-latest": "openai/gpt-5.6-terra",
  "claude-sonnet-4": "openai/gpt-5.6-sol",
  "claude-sonnet-4-latest": "openai/gpt-5.6-sol",
  "claude-opus-4": "openai/gpt-5.5",
  "claude-opus-4-latest": "openai/gpt-5.5",
};

export function resolveModel(model?: string): string | null {
  if (!model) return DEFAULT_MODEL;
  const alias = MODEL_ALIASES[model];
  const candidate = alias ?? model;
  if ((ALLOWED_MODELS as readonly string[]).includes(candidate)) return candidate;
  // Qualquer alias Claude desconhecido cai no modelo padrão (sem permitir modelos arbitrários).
  if (/^claude[-.]/i.test(model)) return DEFAULT_MODEL;
  return null;
}

/* ───────────────────────────── limites de payload ───────────────────────── */

export const MAX_MESSAGES = 100;
export const MAX_BODY_BYTES = 400_000; // ~400 KB
export const MAX_TOTAL_CHARS = 300_000;

/* ─────────────────────────────── autenticação ───────────────────────────── */

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function extractToken(request: Request): string {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) return apiKey.trim();
  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

/**
 * Valida o token contra a secret CLAUDE_CODE_GATEWAY_TOKEN.
 * O AI_CHAT_TEST_TOKEN NUNCA é aceito aqui (nem em dev): este endpoint tem a
 * sua própria credencial.
 */
export function isAuthorized(request: Request): boolean {
  const provided = extractToken(request);
  const expected = process.env["CLAUDE_CODE_GATEWAY_TOKEN"];
  if (!provided || !expected) return false;
  return safeEqual(provided, expected);
}

/* ─────────────────────────────── rate limiting ──────────────────────────── */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const buckets = new Map<string, number[]>();

/** Chave derivada do IP (nunca do token) para não guardar credenciais. */
export function rateLimitKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function checkRateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - (hits[0] ?? now))) / 1000);
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5_000) buckets.clear();
  return { ok: true, retryAfter: 0 };
}

/* ────────────────────────────────── erros ───────────────────────────────── */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, anthropic-version",
};

export function anthropicError(status: number, type: string, message: string, extra?: Record<string, string>) {
  return new Response(
    JSON.stringify({ type: "error", error: { type, message }, notice: EXPERIMENTAL_NOTICE }),
    {
      status,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...(extra ?? {}) },
    },
  );
}

/* ───────────────────────── tipos Anthropic (subset) ─────────────────────── */

export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content?: unknown; is_error?: boolean }
  | { type: string; [k: string]: unknown };

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

export interface MessagesRequest {
  model?: string;
  max_tokens?: number;
  system?: string | AnthropicContentBlock[];
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  tool_choice?: { type: "auto" | "any" | "tool"; name?: string };
  stream?: boolean;
  temperature?: number;
}

const blocks = (c: AnthropicMessage["content"]): AnthropicContentBlock[] =>
  typeof c === "string" ? [{ type: "text", text: c }] : c;

export function systemToText(system: MessagesRequest["system"]): string | undefined {
  if (!system) return undefined;
  if (typeof system === "string") return system;
  return system
    .map((b) => (b.type === "text" ? (b as { text: string }).text : ""))
    .filter(Boolean)
    .join("\n\n");
}

const textOf = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((b) =>
        typeof b === "string" ? b : b && typeof b === "object" && "text" in b ? String((b as { text: unknown }).text) : JSON.stringify(b),
      )
      .join("\n");
  return content == null ? "" : JSON.stringify(content);
};

/* ───────────────── Anthropic → OpenAI-compatible (chat completions) ─────── */

export function toChatCompletions(req: MessagesRequest, model: string) {
  const msgs: Record<string, unknown>[] = [];
  const system = systemToText(req.system);
  if (system) msgs.push({ role: "system", content: system });

  for (const m of req.messages) {
    const bs = blocks(m.content);
    const text = bs
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
    const toolUses = bs.filter((b) => b.type === "tool_use") as Extract<
      AnthropicContentBlock,
      { type: "tool_use" }
    >[];
    const toolResults = bs.filter((b) => b.type === "tool_result") as Extract<
      AnthropicContentBlock,
      { type: "tool_result" }
    >[];

    if (m.role === "assistant") {
      msgs.push({
        role: "assistant",
        content: text || null,
        ...(toolUses.length
          ? {
              tool_calls: toolUses.map((t) => ({
                id: t.id,
                type: "function",
                function: { name: t.name, arguments: JSON.stringify(t.input ?? {}) },
              })),
            }
          : {}),
      });
      continue;
    }

    for (const r of toolResults) {
      msgs.push({ role: "tool", tool_call_id: r.tool_use_id, content: textOf(r.content) });
    }
    if (text) msgs.push({ role: "user", content: text });
  }

  const tools = req.tools?.length
    ? req.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          ...(t.description ? { description: t.description } : {}),
          parameters: t.input_schema ?? { type: "object", properties: {} },
        },
      }))
    : undefined;

  let toolChoice: unknown;
  if (req.tool_choice) {
    if (req.tool_choice.type === "auto") toolChoice = "auto";
    else if (req.tool_choice.type === "any") toolChoice = "required";
    else if (req.tool_choice.type === "tool" && req.tool_choice.name)
      toolChoice = { type: "function", function: { name: req.tool_choice.name } };
  }

  return {
    model,
    messages: msgs,
    stream: true,
    stream_options: { include_usage: true },
    ...(req.max_tokens ? { max_tokens: req.max_tokens } : {}),
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
  };
}

/* ─────────────────── Anthropic → Responses API (openai/*) ───────────────── */

export function toResponsesRequest(req: MessagesRequest, model: string) {
  const input: Record<string, unknown>[] = [];

  for (const m of req.messages) {
    const bs = blocks(m.content);
    const text = bs
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
    const toolUses = bs.filter((b) => b.type === "tool_use") as Extract<
      AnthropicContentBlock,
      { type: "tool_use" }
    >[];
    const toolResults = bs.filter((b) => b.type === "tool_result") as Extract<
      AnthropicContentBlock,
      { type: "tool_result" }
    >[];

    if (m.role === "assistant") {
      if (text)
        input.push({ role: "assistant", content: [{ type: "output_text", text }] });
      for (const t of toolUses)
        input.push({
          type: "function_call",
          call_id: t.id,
          name: t.name,
          arguments: JSON.stringify(t.input ?? {}),
        });
      continue;
    }

    for (const r of toolResults)
      input.push({ type: "function_call_output", call_id: r.tool_use_id, output: textOf(r.content) });
    if (text) input.push({ role: "user", content: [{ type: "input_text", text }] });
  }

  const system = systemToText(req.system);

  const tools = req.tools?.length
    ? req.tools.map((t) => ({
        type: "function",
        name: t.name,
        ...(t.description ? { description: t.description } : {}),
        parameters: t.input_schema ?? { type: "object", properties: {}, additionalProperties: false },
        strict: false,
      }))
    : undefined;

  let toolChoice: unknown;
  if (req.tool_choice) {
    if (req.tool_choice.type === "auto") toolChoice = "auto";
    else if (req.tool_choice.type === "any") toolChoice = "required";
    else if (req.tool_choice.type === "tool" && req.tool_choice.name)
      toolChoice = { type: "function", name: req.tool_choice.name };
  }

  return {
    model,
    input,
    stream: true,
    store: false,
    ...(system ? { instructions: system } : {}),
    ...(req.max_tokens ? { max_output_tokens: req.max_tokens } : {}),
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
  };
}

/* ───────────────────────── acumulador normalizado ───────────────────────── */

export interface ToolUseAcc {
  id: string;
  name: string;
  args: string;
}

export interface Accumulated {
  text: string;
  toolUses: ToolUseAcc[];
  stopReason: "end_turn" | "tool_use" | "max_tokens";
  usage: { input_tokens: number; output_tokens: number };
}

export function toAnthropicMessage(model: string, acc: Accumulated) {
  const content: AnthropicContentBlock[] = [];
  if (acc.text) content.push({ type: "text", text: acc.text });
  for (const t of acc.toolUses) {
    let input: unknown = {};
    try {
      input = t.args ? JSON.parse(t.args) : {};
    } catch {
      input = { _raw: t.args };
    }
    content.push({ type: "tool_use", id: t.id, name: t.name, input });
  }
  if (content.length === 0) content.push({ type: "text", text: "" });

  return {
    id: `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
    type: "message",
    role: "assistant",
    model,
    content,
    stop_reason: acc.toolUses.length ? "tool_use" : acc.stopReason,
    stop_sequence: null,
    usage: acc.usage,
  };
}

/* ─────────────────────────── parsing de SSE upstream ────────────────────── */

export async function* sseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
}


/** Consome o SSE do upstream e produz um resultado normalizado. */
export async function consumeUpstream(
  upstream: Response,
  isOpenAI: boolean,
  onText?: (chunk: string) => void,
): Promise<Accumulated> {
  const acc: Accumulated = {
    text: "",
    toolUses: [],
    stopReason: "end_turn",
    usage: { input_tokens: 0, output_tokens: 0 },
  };
  if (!upstream.body) return acc;

  for await (const data of sseEvents(upstream.body)) {
    if (!data || data === "[DONE]") continue;
    let evt: any;
    try {
      evt = JSON.parse(data);
    } catch {
      continue;
    }

    if (isOpenAI) {
      if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
        acc.text += evt.delta;
        onText?.(evt.delta);
      } else if (evt.type === "response.completed" && evt.response) {
        const out = Array.isArray(evt.response.output) ? evt.response.output : [];
        for (const item of out) {
          if (item?.type === "function_call") {
            acc.toolUses.push({
              id: item.call_id ?? item.id ?? crypto.randomUUID(),
              name: item.name ?? "",
              args: typeof item.arguments === "string" ? item.arguments : JSON.stringify(item.arguments ?? {}),
            });
          }
        }
        const u = evt.response.usage;
        if (u) {
          acc.usage.input_tokens = u.input_tokens ?? 0;
          acc.usage.output_tokens = u.output_tokens ?? 0;
        }
        if (evt.response.incomplete_details?.reason === "max_output_tokens") acc.stopReason = "max_tokens";
      }
      continue;
    }

    // chat completions
    const choice = evt.choices?.[0];
    const delta = choice?.delta;
    if (typeof delta?.content === "string" && delta.content) {
      acc.text += delta.content;
      onText?.(delta.content);
    }
    if (Array.isArray(delta?.tool_calls)) {
      for (const tc of delta.tool_calls) {
        const i = tc.index ?? 0;
        acc.toolUses[i] ??= { id: tc.id ?? `toolu_${crypto.randomUUID().slice(0, 8)}`, name: "", args: "" };
        const slot = acc.toolUses[i]!;
        if (tc.id) slot.id = tc.id;
        if (tc.function?.name) slot.name += tc.function.name;
        if (tc.function?.arguments) slot.args += tc.function.arguments;
      }
    }
    if (choice?.finish_reason === "length") acc.stopReason = "max_tokens";
    if (choice?.finish_reason === "tool_calls") acc.stopReason = "tool_use";
    if (evt.usage) {
      acc.usage.input_tokens = evt.usage.prompt_tokens ?? acc.usage.input_tokens;
      acc.usage.output_tokens = evt.usage.completion_tokens ?? acc.usage.output_tokens;
    }
  }

  acc.toolUses = acc.toolUses.filter(Boolean);
  return acc;
}

/* ───────────────────────── streaming SSE Anthropic ──────────────────────── */

export function anthropicStream(model: string, upstream: Response, isOpenAI: boolean): Response {
  const encoder = new TextEncoder();
  const messageId = `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      try {
        send("message_start", {
          type: "message_start",
          message: {
            id: messageId,
            type: "message",
            role: "assistant",
            model,
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 0, output_tokens: 0 },
          },
        });

        let textOpen = false;
        const acc = await consumeUpstream(upstream, isOpenAI, (chunk) => {
          if (!textOpen) {
            textOpen = true;
            send("content_block_start", {
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" },
            });
          }
          send("content_block_delta", {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: chunk },
          });
        });

        if (textOpen) send("content_block_stop", { type: "content_block_stop", index: 0 });

        let index = textOpen ? 1 : 0;
        for (const t of acc.toolUses) {
          let input: unknown = {};
          try {
            input = t.args ? JSON.parse(t.args) : {};
          } catch {
            input = { _raw: t.args };
          }
          send("content_block_start", {
            type: "content_block_start",
            index,
            content_block: { type: "tool_use", id: t.id, name: t.name, input: {} },
          });
          send("content_block_delta", {
            type: "content_block_delta",
            index,
            delta: { type: "input_json_delta", partial_json: JSON.stringify(input) },
          });
          send("content_block_stop", { type: "content_block_stop", index });
          index++;
        }

        send("message_delta", {
          type: "message_delta",
          delta: {
            stop_reason: acc.toolUses.length ? "tool_use" : acc.stopReason,
            stop_sequence: null,
          },
          usage: { output_tokens: acc.usage.output_tokens },
        });
        send("message_stop", { type: "message_stop" });
      } catch {
        send("error", { type: "error", error: { type: "api_error", message: "Falha ao processar o stream." } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    },
  });
}
