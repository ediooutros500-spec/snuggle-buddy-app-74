const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-typescript.cjs");
test("native MCP tools preserve deferred definitions, references, parallel calls and results", () => {
  const { nativeAnthropicPayload } = load("src/lib/anthropic-native.server.ts", {
    "./key-pool.server": { getPoolAdmin: () => null },
  });
  const body = {
    model: "alias",
    max_tokens: 256,
    tools: [
      {
        name: "mcp__github__search",
        defer_loading: true,
        input_schema: { type: "object", properties: { q: { type: "string" } } },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "test" },
          { type: "tool_reference", tool_name: "mcp__github__search" },
        ],
      },
      {
        role: "assistant",
        content: [
          { type: "tool_use", id: "a", name: "mcp__github__search", input: { q: "one" } },
          { type: "tool_use", id: "b", name: "mcp__github__search", input: { q: "two" } },
        ],
      },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "a", content: "ok" },
          { type: "tool_result", tool_use_id: "b", is_error: true, content: "denied" },
        ],
      },
    ],
  };
  const snapshot = structuredClone(body),
    result = nativeAnthropicPayload(body, "anthropic/claude-sonnet-5", true);
  assert.deepEqual(result, { ...snapshot, model: "anthropic/claude-sonnet-5", stream: true });
  assert.deepEqual(body, snapshot);
});
