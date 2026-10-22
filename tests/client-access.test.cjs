const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs");

function fixture(t, status = "active") {
  const old = process.env.CLAUDE_CODE_GATEWAY_TOKEN;
  process.env.CLAUDE_CODE_GATEWAY_TOKEN = "test-admin-token";
  t.after(() => {
    if (old === undefined) delete process.env.CLAUDE_CODE_GATEWAY_TOKEN;
    else process.env.CLAUDE_CODE_GATEWAY_TOKEN = old;
  });
  const { Route } = load("src/routes/api/public/v1/models.ts", {
    "@tanstack/react-router": { createFileRoute: () => (config) => config },
    "./key-pool.server": {
      getPoolAdmin: () => ({
        from: () => ({
          select: () => ({
            eq: (_column, value) => ({
              single: async () => ({
                error: value === "gw_test-client-key" ? null : { code: "not_found" },
                data:
                  value === "gw_test-client-key"
                    ? {
                        id: "client-1",
                        name: "Test client",
                        status,
                        allowed_models: ["google/gemini-3.6-flash"],
                        rate_limit_rpm: 60,
                      }
                    : null,
              }),
            }),
          }),
        }),
      }),
    },
  });
  return (token) =>
    Route.server.handlers.GET({
      request: new Request("https://api.example.test/api/public/v1/models", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      }),
    });
}

test("active client key discovers only permitted models and aliases", async (t) => {
  const send = fixture(t);
  const response = await send("gw_test-client-key");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.data.some((m) => m.id === "google/gemini-3.6-flash"));
  assert.equal(
    body.data.some((m) => m.id.startsWith("openai/")),
    false,
  );
  assert.equal(JSON.stringify(body).includes("gw_test-client-key"), false);
});

for (const token of [undefined, "invalid-client-key"]) {
  test(`catalog refuses ${token ? "invalid" : "missing"} key`, async (t) => {
    assert.equal((await fixture(t)(token)).status, 401);
  });
}

test("suspended client key cannot access the API", async (t) => {
  assert.equal((await fixture(t, "suspended")("gw_test-client-key")).status, 401);
});

test("client API key does not grant administrative access", async (t) => {
  fixture(t);
  const { Route } = load("src/routes/api/admin/gateway.ts", {
    "@tanstack/react-router": { createFileRoute: () => (config) => config },
    "@/lib/claude-compat.server": { safeEqual: (a, b) => a === b },
    "@/lib/key-pool.server": {
      getPoolAdmin: () => assert.fail("Client cannot reach admin database query"),
    },
  });
  const response = await Route.server.handlers.GET({
    request: new Request("https://panel.example.test/api/admin/gateway", {
      headers: { authorization: "Bearer gw_test-client-key" },
    }),
  });
  assert.equal(response.status, 401);
});
