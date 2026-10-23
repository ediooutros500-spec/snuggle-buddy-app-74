import { consumeNativeAnthropic } from "./anthropic-native.server";
/**
 * Camada de compatibilidade com a OpenAI Chat Completions API.
 *
 * ⚠️ GATEWAY EXPERIMENTAL — traduz requisições no formato OpenAI para o
 * Lovable AI Gateway (`google/*` via /v1/chat/completions, `openai/*` via
 * /v1/responses). A LOVABLE_API_KEY é lida SOMENTE dentro dos handlers e
 * nunca é retornada, logada ou exposta.
 */
import {
  CORS_HEADERS,
  type Accumulated,
  type AnthropicContentBlock,
  type AnthropicMessage,
  type MessagesRequest,
  consumeUpstream,
} from "./claude-compat.server";

/* ─────────────────────────── tipos OpenAI (subset) ──────────────────────── */

export interface OpenAIToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

export interface OpenAIMessage {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  content?: unknown;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface OpenAIChatRequest {
  model?: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  tools?: Array<{
    type?: string;
    function?: { name: string; description?: string; parameters?: Record<string, unknown> };
  }>;
  tool_choice?: unknown;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
}

export function openaiError(
  status: number,
  message: string,
  code: string,
  extra?: Record<string, string>,
) {
  return new Response(JSON.stringify({ error: { message, type: code, code } }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...(extra ?? {}) },
  });
}

const textOf = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((b) =>
        typeof b === "string"
          ? b
          : b && typeof b === "object" && "text" in (b as Record<string, unknown>)
            ? String((b as { text: unknown }).text)
            : "",
      )
      .filter(Boolean)
      .join("\n");
  return content == null ? "" : String(content);
};

/** OpenAI Chat request → estrutura interna comum (reaproveita os conversores). */
export function toInternalRequest(req: OpenAIChatRequest, model: string): MessagesRequest {
  const systemParts: string[] = [];
  const messages: AnthropicMessage[] = [];

  for (const m of req.messages) {
    if (m.role === "system" || m.role === "developer") {
      const t = textOf(m.content);
      if (t) systemParts.push(t);
      continue;
    }
    if (m.role === "tool") {
      messages.push({
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: m.tool_call_id ?? "", content: textOf(m.content) },
        ] as AnthropicContentBlock[],
      });
      continue;
    }
    const blocks: AnthropicContentBlock[] = [];
    const t = textOf(m.content);
    if (t) blocks.push({ type: "text", text: t });
    if (m.role === "assistant" && Array.isArray(m.tool_calls)) {
      for (const tc of m.tool_calls) {
        let input: unknown = {};
        try {
          input = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          input = {};
        }
        blocks.push({ type: "tool_use", id: tc.id ?? "", name: tc.function?.name ?? "", input });
      }
    }
    if (blocks.length === 0) blocks.push({ type: "text", text: "" });
    messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: blocks });
  }

  let tool_choice: MessagesRequest["tool_choice"];
  const tc = req.tool_choice;
  if (tc === "auto" || tc === "none") tool_choice = { type: tc };
  else if (tc === "required") tool_choice = { type: "any" };
  else if (tc && typeof tc === "object") {
    const name = (tc as { function?: { name?: string } }).function?.name;
    if (name) tool_choice = { type: "tool", name };
  }

  return {
    model,
    ...(systemParts.length ? { system: systemParts.join("\n\n") } : {}),
    messages,
    ...((req.max_tokens ?? req.max_completion_tokens) !== undefined
      ? { max_tokens: req.max_tokens ?? req.max_completion_tokens }
      : {}),
    ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
    ...(req.tools?.length
      ? {
          tools: req.tools
            .filter((t) => t.function?.name)
            .map((t) => ({
              name: t.function!.name,
              ...(t.function!.description ? { description: t.function!.description } : {}),
              ...(t.function!.parameters ? { input_schema: t.function!.parameters } : {}),
            })),
        }
      : {}),
    ...(tool_choice ? { tool_choice } : {}),
  };
}

const completionId = () => `chatcmpl_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;

function finishReason(acc: Accumulated): string {
  if (acc.toolUses.length) return "tool_calls";
  if (acc.stopReason === "max_tokens") return "length";
  return "stop";
}

/** Resultado normalizado → resposta OpenAI chat.completion. */
export function toChatCompletion(model: string, acc: Accumulated) {
  const tool_calls = acc.toolUses.map((t) => ({
    id: t.id,
    type: "function",
    function: { name: t.name, arguments: t.args || "{}" },
  }));

  return {
    id: completionId(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: acc.text || null,
          ...(tool_calls.length ? { tool_calls } : {}),
        },
        logprobs: null,
        finish_reason: finishReason(acc),
      },
    ],
    usage: {
      prompt_tokens: acc.usage.input_tokens,
      completion_tokens: acc.usage.output_tokens,
      total_tokens: acc.usage.input_tokens + acc.usage.output_tokens,
    },
  };
}

/** SSE no formato OpenAI (chat.completion.chunk), sem buffer. */
export function openaiStream(
  model: string,
  upstream: Response,
  isOpenAI: boolean | "anthropic",
  onComplete?: (acc: Accumulated | null, error?: boolean) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const id = completionId();
  const created = Math.floor(Date.now() / 1000);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const chunk = (
        delta: Record<string, unknown>,
        finish: string | null = null,
        usage?: unknown,
      ) =>
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id,
              object: "chat.completion.chunk",
              created,
              model,
              choices: [{ index: 0, delta, logprobs: null, finish_reason: finish }],
              ...(usage ? { usage } : {}),
            })}\n\n`,
          ),
        );

      try {
        chunk({ role: "assistant", content: "" });

        const onText = (text: string) => chunk({ content: text });
        const acc =
          isOpenAI === "anthropic"
            ? await consumeNativeAnthropic(upstream, onText)
            : await consumeUpstream(upstream, isOpenAI, onText);

        if (acc.toolUses.length) {
          chunk({
            tool_calls: acc.toolUses.map((t, index) => ({
              index,
              id: t.id,
              type: "function",
              function: { name: t.name, arguments: t.args || "{}" },
            })),
          });
        }

        await onComplete?.(acc);
        chunk({}, finishReason(acc), {
          prompt_tokens: acc.usage.input_tokens,
          completion_tokens: acc.usage.output_tokens,
          total_tokens: acc.usage.input_tokens + acc.usage.output_tokens,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch {
        await onComplete?.(null, true);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: { message: "Falha ao processar o stream.", type: "api_error" } })}\n\n`,
          ),
        );
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
