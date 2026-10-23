const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-typescript.cjs");
test("provider failures mask credentials and logs contain classifications rather than conversation values", async () => {
  const { readProviderFailure } = load("src/lib/provider-errors.server.ts");
  const f = await readProviderFailure(
    Response.json(
      {
        error: {
          type: "invalid_request_error",
          message:
            "thinking.budget_tokens must be less than max_tokens; test-provider-secret; Bearer another-secret; private prompt text",
        },
      },
      { status: 400 },
    ),
    "test-provider-secret",
  );
  assert.equal(f.status, 400);
  assert.equal(f.type, "invalid_request_error");
  assert.ok(f.message.includes("max_tokens"));
  assert.equal(f.message.includes("test-provider-secret"), false);
  assert.equal(f.message.includes("another-secret"), false);
  assert.ok(f.diagnostic.includes("thinking"));
  assert.ok(f.diagnostic.includes("invalid_request"));
  assert.equal(f.diagnostic.includes("private prompt text"), false);
});
test("unknown provider bodies produce safe errors without echoing arbitrary JSON", async () => {
  const { readProviderFailure } = load("src/lib/provider-errors.server.ts");
  const r = await readProviderFailure(
    Response.json({ input: "private-prompt" }, { status: 400 }),
    "test-only-key",
  );
  assert.equal(JSON.stringify(r).includes("private-prompt"), false);
  const text = await readProviderFailure(
    new Response("<html>secret</html>", { status: 502 }),
    "test-only-key",
  );
  assert.equal(text.message.includes("secret"), false);
});
for (const endpoint of ["messages", "chat/completions"])
  test(
    endpoint +
      " preserves nonretryable provider status instead of disguising a bad parameter as 502",
    async () => {
      const calls = [];
      const { Route } = load("src/routes/api/public/v1/" + endpoint + ".ts", {
        "@tanstack/react-router": { createFileRoute: () => (c) => c },
        "./key-pool.server": { getPoolAdmin: () => null },
        "@/lib/claude-compat.server": {
          ...load("src/lib/claude-compat.server.ts", {
            "./key-pool.server": { getPoolAdmin: () => null },
          }),
          authenticateGatewayRequest: async () => ({ authorized: true, isAdmin: false }),
        },
        "@/lib/gateway-policy.server": {
          readGatewaySettings: async () => ({}),
          resolvePolicyModel: () => "anthropic/claude-fable-5-1",
          admitModelAttempt: async () => {},
          policyErrorResponse: () => new Response("{}", { status: 403 }),
        },
        "@/lib/key-pool.server": {
          fetchGatewayWithFailover: async () => {
            calls.push(1);
            return {
              upstream: Response.json({}, { status: 400 }),
              networkError: false,
              providerFailure: {
                status: 400,
                type: "invalid_request_error",
                message: "thinking.budget_tokens must be less than max_tokens",
                diagnostic: "upstream HTTP 400; fields=thinking,max_tokens",
              },
            };
          },
        },
      });
      const r = await Route.server.handlers.POST({
        request: new Request("https://api.example.test/api/public/v1/" + endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: "anthropic/claude-fable-5-1",
            max_tokens: 128,
            messages: [{ role: "user", content: "hello" }],
          }),
        }),
      });
      assert.equal(r.status, 400);
      const d = await r.json();
      assert.match(d.error.message, /budget_tokens/);
      assert.equal(calls.length, 1);
    },
  );
