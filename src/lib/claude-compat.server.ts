/**
 * Camada de compatibilidade com a Anthropic Messages API (Claude Code).
 *
 * ⚠️ GATEWAY EXPERIMENTAL — traduz requisições para o Lovable AI Gateway
 * com suporte a Autenticação por Chave de Cliente individual ou Token Admin.
 */
import { getPoolAdmin } from "./key-pool.server";
import { storedClientKey } from "./client-keys.server";
import { checkClientAccess } from "./client-access.server";

export const EXPERIMENTAL_NOTICE =
  "Gateway experimental compatível com Claude Code. Não é a API oficial da Anthropic; " +
  "modelos Anthropic usam Messages nativo no Lovable; outros modelos usam conversão de formato.";

export const DEFAULT_MODEL = "google/gemini-3.6-flash";

/** Allowlist configurável no backend. */
export const ALLOWED_MODELS = [
  "anthropic/claude-opus-5-5",
  "anthropic/claude-opus-5",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-haiku-4-5",
  "anthropic/claude-fable-5-1",
  "openai/gpt-6-astra",
  "openai/gpt-6.1-sol",
  "google/gemini-4-argon",
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

/** Nomes estilo Claude Code e OpenAI mapeados para modelos reais do gateway. */
export const MODEL_ALIASES: Record<string, string> = {
  "claude-opus-5-5": "anthropic/claude-opus-5-5",
  "claude-opus-5": "anthropic/claude-opus-5",
  "claude-sonnet-5": "anthropic/claude-sonnet-5",
  "claude-fable-5-1": "anthropic/claude-fable-5-1",
  "claude-3-5-haiku": "anthropic/claude-haiku-4-5",
  "claude-3-5-haiku-latest": "anthropic/claude-haiku-4-5",
  "claude-3-5-haiku-20241022": "anthropic/claude-haiku-4-5",
  "claude-haiku-4-5": "anthropic/claude-haiku-4-5",
  "claude-haiku-4-5-20251001": "anthropic/claude-haiku-4-5",
  "claude-3-5-sonnet": "anthropic/claude-sonnet-5",
  "claude-3-5-sonnet-latest": "anthropic/claude-sonnet-5",
  "claude-3-5-sonnet-20241022": "anthropic/claude-sonnet-5",
  "claude-3-7-sonnet-latest": "anthropic/claude-sonnet-5",
  "claude-3-7-sonnet-20250219": "anthropic/claude-sonnet-5",
  "claude-sonnet-4": "anthropic/claude-sonnet-5",
  "claude-sonnet-4-latest": "anthropic/claude-sonnet-5",
  "claude-sonnet-4-20250514": "anthropic/claude-sonnet-5",
  "claude-sonnet-4-5": "anthropic/claude-sonnet-5",
  "claude-sonnet-4-5-20250929": "anthropic/claude-sonnet-5",
  "claude-opus-4": "anthropic/claude-opus-5-5",
  "claude-opus-4-latest": "anthropic/claude-opus-5-5",
  "claude-opus-4-20250514": "anthropic/claude-opus-5-5",
  "claude-opus-4-1": "anthropic/claude-opus-5-5",
  "gpt-4o": "openai/gpt-5.6-sol",
  "gpt-4o-mini": "google/gemini-3.6-flash",
  "gpt-4.1": "openai/gpt-5.6-sol",
  "gpt-4.1-mini": "google/gemini-3.6-flash",
  "o3-mini": "openai/gpt-5.5",
};

export function resolveModel(
  model?: string,
  disabledModels: string[] = [],
  defaultModel = DEFAULT_MODEL,
): string | null {
  if (model !== undefined && typeof model !== "string") return null;
  const trimmed = model?.trim() || defaultModel;
  const alias = MODEL_ALIASES[trimmed];
  let candidate = alias ?? trimmed;
  if (!(ALLOWED_MODELS as readonly string[]).includes(candidate)) {
    if (/^claude[-.]/i.test(trimmed)) {
      return null; // Unknown Claude names never silently select another model/provider.
    } else if (/^(gpt-|o1|o3|o4|gemini-)/i.test(trimmed)) {
      candidate = defaultModel;
    } else return null;
  }
  return (ALLOWED_MODELS as readonly string[]).includes(candidate) &&
    !disabledModels.some((x) => x === trimmed || (MODEL_ALIASES[x] ?? x) === candidate)
    ? candidate
    : null;
}

export const MAX_MESSAGES = 200;
export const MAX_BODY_BYTES = 2_000_000;
export const MAX_TOTAL_CHARS = 1_500_000;

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
 * Validação de autorização dupla:
 * 1. Confere se é o CLAUDE_CODE_GATEWAY_TOKEN (Admin).
 * 2. OU confere se é uma client_key emitida na tabela `gateway_clients`.
 */
export async function authenticateGatewayRequest(
  request: Request,
  observeAccess = true,
): Promise<{
  authorized: boolean;
  isAdmin: boolean;
  client?: {
    id: string;
    name: string;
    allowed_models: string[] | null;
    rate_limit_rpm: number;
  };
}> {
  const token = extractToken(request);
  if (!token || token.startsWith("gw_hash_v1:")) return { authorized: false, isAdmin: false };

  // 1. Confere token admin
  const adminExpected = process.env["CLAUDE_CODE_GATEWAY_TOKEN"];
  if (adminExpected && safeEqual(token, adminExpected)) {
    return { authorized: true, isAdmin: true };
  }

  // 2. Confere cliente registrado no 2º Supabase
  const pool = getPoolAdmin();
  if (pool) {
    try {
      let { data, error } = await pool
        .from("gateway_clients")
        .select("id, name, status, allowed_models, rate_limit_rpm")
        .eq("client_key", storedClientKey(token))
        .single();

      // Temporary compatibility for keys issued before the hash migration.
      if (!data && process.env["GATOR_ALLOW_LEGACY_CLIENT_KEYS"] !== "false") {
        const legacy = await pool
          .from("gateway_clients")
          .select("id, name, status, allowed_models, rate_limit_rpm")
          .eq("client_key", token)
          .single();
        data = legacy.data;
        error = legacy.error;
      }

      if (!error && data && data.status === "active") {
        if (!(await checkClientAccess(request, data.id, observeAccess)))
          return { authorized: false, isAdmin: false };
        return {
          authorized: true,
          isAdmin: false,
          client: {
            id: data.id,
            name: data.name,
            allowed_models: data.allowed_models,
            rate_limit_rpm: data.rate_limit_rpm,
          },
        };
      }
    } catch {
      // Silencioso
    }
  }

  return { authorized: false, isAdmin: false };
}

export function isAuthorized(request: Request): boolean {
  const token = extractToken(request);
  const expected = process.env["CLAUDE_CODE_GATEWAY_TOKEN"];
  if (!token || !expected) return false;
  return safeEqual(token, expected);
}

const WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

export function rateLimitKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function checkRateLimit(key: string, limitRpm = 120): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= limitRpm) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - (hits[0] ?? now))) / 1000);
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5_000) buckets.clear();
  return { ok: true, retryAfter: 0 };
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-device-id, content-type, anthropic-version, anthropic-beta, x-stainless-arch, x-stainless-lang, x-stainless-os, x-stainless-package-version, x-stainless-runtime, x-stainless-runtime-version",
};

export function anthropicError(
  status: number,
  type: string,
  message: string,
  extra?: Record<string, string>,
) {
  return new Response(
    JSON.stringify({ type: "error", error: { type, message }, notice: EXPERIMENTAL_NOTICE }),
    {
      status,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...(extra ?? {}) },
    },
  );
}

export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content?: unknown; is_error?: boolean }
  | { type: string; [k: string]: unknown };

export interface AnthropicMessage {
  role: "user" | "assistant" | "system";
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
  tool_choice?: { type: "auto" | "any" | "tool" | "none"; name?: string };
  stream?: boolean;
  temperature?: number;
}

const blocks = (c: AnthropicMessage["content"]): AnthropicContentBlock[] =>
  typeof c === "string" ? [{ type: "text", text: c }] : Array.isArray(c) ? c : [];

export function systemToText(system: MessagesRequest["system"]): string | undefined {
  if (!system) return undefined;
  if (typeof system === "string") return system;
  if (!Array.isArray(system)) return undefined;
  return system
    .map((b) => (b && b.type === "text" ? String((b as { text?: unknown }).text ?? "") : ""))
    .filter(Boolean)
    .join("\n\n");
}

const textOf = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((b) =>
        typeof b === "string"
          ? b
          : b && typeof b === "object" && "text" in b
            ? String((b as { text: unknown }).text)
            : JSON.stringify(b),
      )
      .join("\n");
  return content == null ? "" : JSON.stringify(content);
};

function sanitizeJsonSchema(schema?: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== "object") {
    return { type: "object", properties: {} };
  }
  const clone: Record<string, unknown> = { ...schema };
  delete clone["$schema"];
  if (!clone["type"]) clone["type"] = "object";
  if (clone["type"] === "object" && !clone["properties"]) {
    clone["properties"] = {};
  }
  return clone;
}

export function toChatCompletions(req: MessagesRequest, model: string) {
  if (req.messages.some((message) => message.role === "system"))
    throw new Error("Instruções de sistema intermediárias exigem Anthropic Messages nativo.");
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
    if (text || toolResults.length === 0) {
      msgs.push({ role: "user", content: text || " " });
    }
  }

  const tools = req.tools?.length
    ? req.tools
        .filter((t) => t && typeof t.name === "string" && t.name.length > 0)
        .map((t) => ({
          type: "function",
          function: {
            name: t.name,
            ...(t.description ? { description: t.description } : {}),
            parameters: sanitizeJsonSchema(t.input_schema),
          },
        }))
    : undefined;

  let toolChoice: unknown;
  if (req.tool_choice) {
    if (req.tool_choice.type === "auto") toolChoice = "auto";
    else if (req.tool_choice.type === "none") toolChoice = "none";
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
    ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
    ...(tools?.length ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
  };
}

export function toResponsesRequest(req: MessagesRequest, model: string) {
  if (req.messages.some((message) => message.role === "system"))
    throw new Error("Instruções de sistema intermediárias exigem Anthropic Messages nativo.");
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
      if (text) input.push({ role: "assistant", content: [{ type: "output_text", text }] });
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
      input.push({
        type: "function_call_output",
        call_id: r.tool_use_id,
        output: textOf(r.content),
      });
    if (text || toolResults.length === 0)
      input.push({ role: "user", content: [{ type: "input_text", text: text || " " }] });
  }

  const system = systemToText(req.system);

  const tools = req.tools?.length
    ? req.tools
        .filter((t) => t && typeof t.name === "string" && t.name.length > 0)
        .map((t) => ({
          type: "function",
          name: t.name,
          ...(t.description ? { description: t.description } : {}),
          parameters: sanitizeJsonSchema(t.input_schema),
          strict: false,
        }))
    : undefined;

  let toolChoice: unknown;
  if (req.tool_choice) {
    if (req.tool_choice.type === "auto") toolChoice = "auto";
    else if (req.tool_choice.type === "none") toolChoice = "none";
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
    ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
    ...(tools?.length ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
  };
}

export interface ToolUseAcc {
  id: string;
  name: string;
  args: string;
}

export interface Accumulated {
  usageKnown?: boolean;
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
  const trailing = buffer.trim();
  if (trailing.startsWith("data:")) yield trailing.slice(5).trim();
}

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
    let evt: {
      type?: string;
      delta?: string;
      response?: {
        output?: {
          type?: string;
          call_id?: string;
          id?: string;
          name?: string;
          arguments?: unknown;
        }[];
        usage?: { input_tokens?: number; output_tokens?: number };
        incomplete_details?: { reason?: string };
      };
      choices?: {
        finish_reason?: string;
        delta?: {
          content?: string;
          tool_calls?: {
            index?: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          }[];
        };
      }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
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
              args:
                typeof item.arguments === "string"
                  ? item.arguments
                  : JSON.stringify(item.arguments ?? {}),
            });
          }
        }
        const u = evt.response.usage;
        if (u) {
          acc.usageKnown = true;
          acc.usage.input_tokens = u.input_tokens ?? 0;
          acc.usage.output_tokens = u.output_tokens ?? 0;
        }
        if (evt.response.incomplete_details?.reason === "max_output_tokens")
          acc.stopReason = "max_tokens";
      }
      continue;
    }

    const choice = evt.choices?.[0];
    const delta = choice?.delta;
    if (typeof delta?.content === "string" && delta.content) {
      acc.text += delta.content;
      onText?.(delta.content);
    }
    if (Array.isArray(delta?.tool_calls)) {
      for (const tc of delta.tool_calls) {
        const i = tc.index ?? 0;
        acc.toolUses[i] ??= {
          id: tc.id ?? `toolu_${crypto.randomUUID().slice(0, 8)}`,
          name: "",
          args: "",
        };
        const slot = acc.toolUses[i]!;
        if (tc.id) slot.id = tc.id;
        if (tc.function?.name) slot.name += tc.function.name;
        if (tc.function?.arguments) slot.args += tc.function.arguments;
      }
    }
    if (choice?.finish_reason === "length") acc.stopReason = "max_tokens";
    if (choice?.finish_reason === "tool_calls") acc.stopReason = "tool_use";
    if (evt.usage) {
      acc.usageKnown = true;
      acc.usage.input_tokens = evt.usage.prompt_tokens ?? acc.usage.input_tokens;
      acc.usage.output_tokens = evt.usage.completion_tokens ?? acc.usage.output_tokens;
    }
  }

  acc.toolUses = acc.toolUses.filter(Boolean);
  return acc;
}

export function anthropicStream(
  model: string,
  upstream: Response,
  isOpenAI: boolean,
  onComplete?: (acc: Accumulated | null, error?: boolean) => Promise<void>,
): Response {
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
        await onComplete?.(acc);
        send("message_stop", { type: "message_stop" });
      } catch {
        await onComplete?.(null, true);
        send("error", {
          type: "error",
          error: { type: "api_error", message: "Falha ao processar o stream." },
        });
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
