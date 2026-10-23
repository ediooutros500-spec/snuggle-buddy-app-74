import {
  CORS_HEADERS,
  sseEvents,
  type Accumulated,
  type MessagesRequest,
} from "./claude-compat.server";

type Usage = { input_tokens?: number; output_tokens?: number };
type NativeEvent = {
  type?: string;
  index?: number;
  message?: { usage?: Usage };
  usage?: Usage;
  content_block?: { type?: string; id?: string; name?: string; input?: unknown };
  delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string };
};
const empty = (): Accumulated => ({
  text: "",
  toolUses: [],
  stopReason: "end_turn",
  usage: { input_tokens: 0, output_tokens: 0 },
});

export function nativeAnthropicPayload(
  body: MessagesRequest,
  model: string,
  stream = Boolean(body.stream),
) {
  const maxTokens = body.max_tokens ?? 1024;
  if (!Number.isInteger(maxTokens) || maxTokens < 1)
    throw new Error("max_tokens deve ser inteiro positivo.");
  // Preserve native thinking, signatures, cache controls, tool results and future body fields.
  return { ...body, model, max_tokens: maxTokens, stream };
}

function usageInto(acc: Accumulated, usage?: Usage) {
  if (!usage) return;
  if (typeof usage.input_tokens === "number") {
    acc.usage.input_tokens = usage.input_tokens;
    acc.usageKnown = true;
  }
  if (typeof usage.output_tokens === "number") {
    acc.usage.output_tokens = usage.output_tokens;
    acc.usageKnown = true;
  }
}
export function nativeMessageUsage(value: unknown): Accumulated {
  const acc = empty();
  if (
    value &&
    typeof value === "object" &&
    "usage" in value &&
    value.usage &&
    typeof value.usage === "object"
  )
    usageInto(acc, value.usage as Usage);
  return acc;
}

/** Converts only when an OpenAI-format client requests Claude. Native Messages bypasses this. */
export async function consumeNativeAnthropic(
  upstream: Response,
  onText?: (text: string) => void,
): Promise<Accumulated> {
  const acc = empty(),
    tools = new Map<number, { id: string; name: string; args: string }>();
  if (!upstream.body) throw new Error("Resposta Anthropic sem corpo.");
  let stopped = false;
  for await (const data of sseEvents(upstream.body)) {
    let event: NativeEvent;
    try {
      event = JSON.parse(data) as NativeEvent;
    } catch {
      continue;
    }
    if (event.type === "error") throw new Error("O provedor interrompeu o stream Anthropic.");
    usageInto(acc, event.message?.usage);
    usageInto(acc, event.usage);
    const index = event.index ?? 0;
    if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
      const block = event.content_block;
      tools.set(index, {
        id: block.id || crypto.randomUUID(),
        name: block.name || "",
        args: block.input && Object.keys(block.input).length ? JSON.stringify(block.input) : "",
      });
    }
    if (event.type === "content_block_delta") {
      if (event.delta?.type === "text_delta" && typeof event.delta.text === "string") {
        acc.text += event.delta.text;
        onText?.(event.delta.text);
      }
      if (event.delta?.type === "input_json_delta") {
        const tool = tools.get(index);
        if (tool) tool.args += event.delta.partial_json || "";
      }
    }
    if (
      event.delta?.stop_reason === "max_tokens" ||
      event.delta?.stop_reason === "tool_use" ||
      event.delta?.stop_reason === "end_turn"
    )
      acc.stopReason = event.delta.stop_reason;
    if (event.type === "message_stop") stopped = true;
  }
  if (!stopped) throw new Error("Stream Anthropic incompleto.");
  acc.toolUses = [...tools.values()].map((tool) => ({ ...tool, args: tool.args || "{}" }));
  return acc;
}

/** Byte-preserving native SSE; parsing is limited to usage metadata, never prompt/response logs. */
export function nativeAnthropicStream(
  upstream: Response,
  onComplete: (acc: Accumulated | null, error?: boolean) => Promise<void>,
): Response {
  if (!upstream.body) throw new Error("Resposta Anthropic sem corpo.");
  const reader = upstream.body.getReader(),
    decoder = new TextDecoder(),
    acc = empty();
  let pending = "",
    skipping = false,
    stopped = false,
    failed = false,
    finished = false;
  const finish = async (error: boolean) => {
    if (!finished) {
      finished = true;
      await onComplete(acc, error);
    }
  };
  const line = (text: string) => {
    if (!text.startsWith("data:")) return;
    try {
      const event = JSON.parse(text.slice(5).trim()) as NativeEvent;
      usageInto(acc, event.message?.usage);
      usageInto(acc, event.usage);
      if (event.type === "message_stop") stopped = true;
      if (event.type === "error") failed = true;
    } catch {
      /* Non-JSON events cannot affect the bytes forwarded to the client. */
    }
  };
  const inspect = (text: string) => {
    const segments = text.split("\n");
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i] || "";
      if (!skipping) pending += segment;
      if (pending.length > 131072) {
        pending = "";
        skipping = true;
      }
      if (i < segments.length - 1) {
        if (!skipping) line(pending.trimEnd());
        pending = "";
        skipping = false;
      }
    }
  };
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const item = await reader.read();
          if (item.done) {
            inspect(decoder.decode());
            if (!skipping && pending) line(pending);
            await finish(failed || !stopped);
            controller.close();
          } else {
            inspect(decoder.decode(item.value, { stream: true }));
            controller.enqueue(item.value);
          }
        } catch {
          await finish(true);
          controller.error(new Error("Stream Anthropic interrompido."));
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason);
        } finally {
          await finish(true);
        }
      },
    }),
    {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        "content-type": "text/event-stream",
        "cache-control": "no-store",
      },
    },
  );
}
