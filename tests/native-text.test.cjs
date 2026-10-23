const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-typescript.cjs");
const noPool = { "./key-pool.server": { getPoolAdmin: () => null } };
const events = [
  { type: "message_start", message: { usage: { input_tokens: 14, output_tokens: 0 } } },
  { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
  { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Olá" } },
  { type: "content_block_stop", index: 0 },
  {
    type: "content_block_start",
    index: 1,
    content_block: { type: "tool_use", id: "toolu_test", name: "weather", input: {} },
  },
  {
    type: "content_block_delta",
    index: 1,
    delta: { type: "input_json_delta", partial_json: '{"city":' },
  },
  {
    type: "content_block_delta",
    index: 1,
    delta: { type: "input_json_delta", partial_json: '"Recife"}' },
  },
  { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 21 } },
  { type: "message_stop" },
];
const sse = (items = events) =>
  items.map((e) => "event: " + e.type + "\ndata: " + JSON.stringify(e) + "\n\n").join("");
function native() {
  return load("src/lib/anthropic-native.server.ts", noPool);
}
function fixture(endpoint, { model, authorized = true, blocked = false, upstream } = {}) {
  const calls = [];
  const { Route } = load("src/routes/api/public/v1/" + endpoint + ".ts", {
    "@tanstack/react-router": { createFileRoute: () => (config) => config },
    "./key-pool.server": { getPoolAdmin: () => null },
    "@/lib/claude-compat.server": {
      ...load("src/lib/claude-compat.server.ts", noPool),
      authenticateGatewayRequest: async () => ({
        authorized,
        isAdmin: false,
        client: { id: "client", name: "test" },
      }),
    },
    "@/lib/key-pool.server": {
      fetchGatewayWithFailover: async (...args) => {
        calls.push(args);
        return {
          upstream: upstream ? upstream() : new Response(sse()),
          networkError: false,
          workerKeyHint: "hint",
        };
      },
    },
    "@/lib/gateway-policy.server": {
      readGatewaySettings: async () => ({}),
      resolvePolicyModel: () => {
        if (blocked) throw new Error("Blocked");
        return model;
      },
      admitModelAttempt: async () => {},
      policyErrorResponse: () => new Response("{}", { status: 403 }),
    },
  });
  return {
    calls,
    send: (body) =>
      Route.server.handlers.POST({
        request: new Request("https://api.example/api/public/v1/" + endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "interleaved-thinking-2025-05-14",
          },
          body: JSON.stringify(body),
        }),
      }),
  };
}

test("all eight requested text IDs share the catalog and Claude aliases select Anthropic only", () => {
  const compat = load("src/lib/claude-compat.server.ts", noPool);
  const policy = load("src/lib/gateway-policy.server.ts", noPool);
  for (const id of [
    "anthropic/claude-opus-5-5",
    "anthropic/claude-opus-5",
    "anthropic/claude-sonnet-5",
    "anthropic/claude-haiku-4-5",
    "anthropic/claude-fable-5-1",
    "openai/gpt-6-astra",
    "openai/gpt-6.1-sol",
    "google/gemini-4-argon",
  ]) {
    assert.equal(compat.resolveModel(id), id);
    assert.ok(policy.MODEL_CATALOG.some((x) => x.id === id && x.kind === "text"));
  }
  for (const [alias, target] of [
    ["claude-3-5-sonnet", "anthropic/claude-sonnet-5"],
    ["claude-sonnet-4", "anthropic/claude-sonnet-5"],
    ["claude-3-5-haiku", "anthropic/claude-haiku-4-5"],
    ["claude-opus-4", "anthropic/claude-opus-5-5"],
  ]) {
    assert.equal(compat.resolveModel(alias), target);
    assert.equal(compat.resolveModel(alias, [target]), null);
  }
  assert.equal(compat.resolveModel("claude-invented-sonnet"), null);
  assert.equal(
    policy.modelPermitted(
      "anthropic/claude-sonnet-5",
      { authorized: true, client: { allowed_models: ["google/gemini-3.6-flash"] } },
      { disabled_models: [] },
    ),
    false,
  );
});

test("native payload preserves tool results, thinking signatures, caching and extra native fields", () => {
  const body = {
    model: "claude-sonnet-4",
    max_tokens: 256,
    stream: true,
    thinking: { type: "enabled", budget_tokens: 128 },
    system: [{ type: "text", text: "system", cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "reason", signature: "signed" },
          { type: "tool_use", id: "toolu", name: "weather", input: { city: "Recife" } },
        ],
      },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu", content: "sunny" }] },
    ],
  };
  assert.deepEqual(native().nativeAnthropicPayload(body, "anthropic/claude-sonnet-5"), {
    ...body,
    model: "anthropic/claude-sonnet-5",
  });
  for (const max_tokens of [0, -1, 1.2, "20"])
    assert.throws(() =>
      native().nativeAnthropicPayload({ ...body, max_tokens }, "anthropic/claude-sonnet-5"),
    );
});

test("native Messages routes JSON without conversion, retaining provider model and usage", async () => {
  const response = {
    type: "message",
    model: "claude-haiku-4-5-20251001",
    content: [{ type: "text", text: "OK" }],
    usage: { input_tokens: 14, output_tokens: 4 },
  };
  const f = fixture("messages", {
    model: "anthropic/claude-haiku-4-5",
    upstream: () => Response.json(response),
  });
  const r = await f.send({
    model: "claude-3-5-haiku",
    max_tokens: 128,
    messages: [{ role: "user", content: "test" }],
    thinking: { type: "disabled" },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), response);
  assert.equal(f.calls[0][0], "https://ai.gateway.lovable.dev/v1/messages");
  assert.equal(f.calls[0][1].thinking.type, "disabled");
  assert.equal(f.calls[0][1].stream, false);
  assert.deepEqual(f.calls[0][3], {
    version: "2023-06-01",
    beta: "interleaved-thinking-2025-05-14",
  });
});

test("native SSE preserves every byte across fragmented Unicode, signatures and tools while measuring usage", async () => {
  const raw = sse([
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "signature_delta", signature: "signature-unchanged" },
    },
    ...events,
  ]);
  const bytes = new TextEncoder().encode(raw);
  let i = 0,
    finished = [];
  const upstream = new Response(
    new ReadableStream({
      pull(c) {
        if (i >= bytes.length) c.close();
        else {
          c.enqueue(bytes.slice(i, i + 7));
          i += 7;
        }
      },
    }),
  );
  const r = native().nativeAnthropicStream(upstream, async (...args) => finished.push(args));
  assert.equal(await r.text(), raw);
  assert.equal(finished.length, 1);
  assert.equal(finished[0][1], false);
  assert.deepEqual(finished[0][0].usage, { input_tokens: 14, output_tokens: 21 });
  assert.equal(finished[0][0].text, "");
  assert.deepEqual(finished[0][0].toolUses, []);
});

test("native SSE skips oversized metadata lines without altering the stream or losing later usage", async () => {
  const raw =
    "data: " +
    JSON.stringify({ type: "content_block_delta", delta: { signature: "s".repeat(140000) } }) +
    "\n\n" +
    sse();
  let done;
  const r = native().nativeAnthropicStream(new Response(raw), async (acc, error) => {
    done = { acc, error };
  });
  assert.equal(await r.text(), raw);
  assert.equal(done.error, false);
  assert.equal(done.acc.usage.output_tokens, 21);
});

test("native stream cancellation cancels upstream and completes telemetry exactly once", async () => {
  let cancelled = false,
    finishes = 0;
  const upstream = new Response(
    new ReadableStream({
      cancel() {
        cancelled = true;
      },
    }),
  );
  const r = native().nativeAnthropicStream(upstream, async (_acc, error) => {
    finishes++;
    assert.equal(error, true);
  });
  await r.body.cancel("client left");
  assert.equal(cancelled, true);
  assert.equal(finishes, 1);
});

test("OpenAI conversion consumes native text, tools and usage; incomplete or error SSE fails explicitly", async () => {
  const acc = await native().consumeNativeAnthropic(new Response(sse()));
  assert.equal(acc.text, "Olá");
  assert.deepEqual(acc.toolUses, [
    { id: "toolu_test", name: "weather", args: '{"city":"Recife"}' },
  ]);
  assert.equal(acc.stopReason, "tool_use");
  assert.equal(acc.usageKnown, true);
  await assert.rejects(
    () => native().consumeNativeAnthropic(new Response(sse(events.slice(0, -1)))),
    /incompleto/,
  );
  await assert.rejects(
    () => native().consumeNativeAnthropic(new Response(sse([{ type: "error" }]))),
    /interrompeu/,
  );
});

test("Chat Completions for Claude sends Anthropic native and returns compatible tool calls", async () => {
  const f = fixture("chat/completions", { model: "anthropic/claude-sonnet-5" });
  const r = await f.send({
    model: "anthropic/claude-sonnet-5",
    messages: [
      { role: "system", content: "sys" },
      { role: "user", content: "weather" },
    ],
    max_tokens: 128,
    tools: [{ type: "function", function: { name: "weather", parameters: { type: "object" } } }],
    tool_choice: "required",
  });
  const data = await r.json();
  assert.equal(r.status, 200);
  assert.equal(data.choices[0].message.content, "Olá");
  assert.equal(data.choices[0].finish_reason, "tool_calls");
  assert.equal(data.choices[0].message.tool_calls[0].function.arguments, '{"city":"Recife"}');
  assert.equal(f.calls[0][0], "https://ai.gateway.lovable.dev/v1/messages");
  assert.equal(f.calls[0][1].stream, true);
  assert.equal(f.calls[0][1].tool_choice.type, "any");
  assert.equal(f.calls[0][1].system, "sys");
});

test("OpenAI SSE for Claude returns chunks and tool calls without pretending native passthrough", async () => {
  const { openaiStream } = load("src/lib/openai-compat.server.ts", noPool);
  let final;
  const r = openaiStream(
    "anthropic/claude-sonnet-5",
    new Response(sse()),
    "anthropic",
    async (acc) => {
      final = acc;
    },
  );
  const text = await r.text();
  assert.ok(text.includes("Olá"));
  assert.ok(text.includes("tool_calls"));
  assert.ok(text.includes("[DONE]"));
  assert.equal(final.usage.output_tokens, 21);
  const { toInternalRequest } = load("src/lib/openai-compat.server.ts", noPool);
  assert.deepEqual(
    toInternalRequest(
      { messages: [{ role: "user", content: "hello" }], tool_choice: "none" },
      "anthropic/claude-sonnet-5",
    ).tool_choice,
    { type: "none" },
  );
});

test("new text destinations preserve existing policy checks before contacting upstream", async () => {
  for (const endpoint of ["messages", "chat/completions"])
    for (const mode of ["anonymous", "blocked"]) {
      const f = fixture(endpoint, {
        model: "anthropic/claude-opus-5-5",
        authorized: mode !== "anonymous",
        blocked: mode === "blocked",
      });
      const r = await f.send({
        model: "anthropic/claude-opus-5-5",
        messages: [{ role: "user", content: "test" }],
      });
      assert.equal(r.status, mode === "anonymous" ? 401 : 403);
      assert.equal(f.calls.length, 0);
    }
});

test("invalid native token budget is rejected instead of becoming an expensive default", async () => {
  const f = fixture("chat/completions", { model: "anthropic/claude-sonnet-5" });
  const r = await f.send({
    model: "anthropic/claude-sonnet-5",
    messages: [{ role: "user", content: "test" }],
    max_tokens: 0,
  });
  assert.equal(r.status, 400);
  assert.equal(f.calls.length, 0);
});

test("Opus accepts inline system messages without moving instructions or changing native fields", async () => {
  const messages = [
    { role: "user", content: "oi" },
    {
      role: "system",
      content: [{ type: "text", text: "new instruction", cache_control: { type: "ephemeral" } }],
      output_config: { effort: "medium" },
    },
  ];
  const response = {
    type: "message",
    model: "claude-opus-5-5",
    content: [{ type: "text", text: "OK" }],
    usage: { input_tokens: 15, output_tokens: 4 },
  };
  const f = fixture("messages", {
    model: "anthropic/claude-opus-5-5",
    upstream: () => Response.json(response),
  });
  const r = await f.send({
    model: "anthropic/claude-opus-5-5",
    max_tokens: 128,
    system: "initial instruction",
    messages,
  });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), response);
  assert.deepEqual(f.calls[0][1].messages, messages);
  assert.equal(f.calls[0][1].system, "initial instruction");
});

test("inline system messages after tool results preserve native tools and history order", async () => {
  const messages = [
    { role: "user", content: "test" },
    {
      role: "assistant",
      content: [
        { type: "tool_use", id: "toolu_example", name: "echo_check", input: { status: "OK" } },
      ],
    },
    {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "toolu_example", content: "OK" }],
    },
    {
      role: "system",
      content: [{ type: "tool_removal", tool: { type: "tool_reference", name: "echo_check" } }],
    },
  ];
  const f = fixture("messages", {
    model: "anthropic/claude-opus-5-5",
    upstream: () => Response.json({ content: [], usage: { input_tokens: 15, output_tokens: 0 } }),
  });
  const r = await f.send({ model: "anthropic/claude-opus-5-5", messages, max_tokens: 128 });
  assert.equal(r.status, 200);
  assert.deepEqual(f.calls[0][1].messages, messages);
});

test("inline system requests can stream native Anthropic without response conversion", async () => {
  const f = fixture("messages", { model: "anthropic/claude-opus-5-5" });
  const r = await f.send({
    model: "anthropic/claude-opus-5-5",
    messages: [
      { role: "user", content: "oi" },
      { role: "system", content: "instruction" },
    ],
    stream: true,
    max_tokens: 128,
  });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), sse());
  assert.equal(f.calls[0][1].messages[1].role, "system");
});

test("invalid roles remain rejected and inline system never becomes a user message for other providers", async () => {
  const invalid = fixture("messages", { model: "anthropic/claude-opus-5-5" });
  const bad = await invalid.send({
    model: "anthropic/claude-opus-5-5",
    messages: [{ role: "developer", content: "x" }],
  });
  assert.equal(bad.status, 400);
  assert.equal(invalid.calls.length, 0);
  const messages = [
    { role: "user", content: "hi" },
    { role: "system", content: "private operator instruction" },
  ];
  const nonNative = fixture("messages", { model: "google/gemini-3.6-flash" });
  const denied = await nonNative.send({ model: "google/gemini-3.6-flash", messages });
  assert.equal(denied.status, 400);
  assert.equal(nonNative.calls.length, 0);
  const compat = load("src/lib/claude-compat.server.ts", noPool);
  assert.throws(
    () => compat.toChatCompletions({ messages }, "google/gemini-3.6-flash"),
    /Anthropic Messages nativo/,
  );
  assert.throws(
    () => compat.toResponsesRequest({ messages }, "openai/gpt-6.1-sol"),
    /Anthropic Messages nativo/,
  );
  assert.equal(messages[1].role, "system");
});

test("pool forwarding attaches provider credentials and native protocol headers only at the fixed upstream", async (t) => {
  const names = ["GATOR_SUPABASE_URL", "GATOR_SUPABASE_SERVICE_ROLE_KEY"];
  const before = Object.fromEntries(names.map((n) => [n, process.env[n]])),
    oldFetch = global.fetch;
  Object.assign(process.env, {
    GATOR_SUPABASE_URL: "https://database.example",
    GATOR_SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  });
  t.after(() => {
    global.fetch = oldFetch;
    for (const n of names) {
      if (before[n] === undefined) delete process.env[n];
      else process.env[n] = before[n];
    }
  });
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response("{}");
  };
  const { fetchGatewayWithFailover } = load("src/lib/key-pool.server.ts", {
    "@supabase/supabase-js": {
      createClient: () => ({ rpc: async () => ({ data: "test-provider-key", error: null }) }),
    },
    "./child-config.server": { getChildConfig: () => ({ remixSyncSecret: "" }) },
    "./child-handshake.server": { triggerChildHandshake: async () => {} },
  });
  await fetchGatewayWithFailover(
    "https://ai.gateway.lovable.dev/v1/messages",
    { model: "anthropic/claude-sonnet-5" },
    1,
    { version: "2023-06-01", beta: "test-beta" },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers["Lovable-API-Key"], "test-provider-key");
  assert.equal(calls[0].init.headers["anthropic-version"], "2023-06-01");
  assert.equal(calls[0].init.headers["anthropic-beta"], "test-beta");
  assert.equal(calls[0].init.headers.authorization, undefined);
  assert.equal(calls[0].init.redirect, "manual");
});
