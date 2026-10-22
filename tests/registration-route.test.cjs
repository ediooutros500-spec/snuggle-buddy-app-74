const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs");

function route(t, fetcher) {
  const original = global.fetch;
  global.fetch = fetcher;
  t.after(() => {
    global.fetch = original;
  });
  let rpcCalls = 0;
  const { Route } = load("src/routes/api/public/v1/workers/register.ts", {
    "@tanstack/react-router": { createFileRoute: () => (configuration) => configuration },
    "@/lib/claude-compat.server": { CORS_HEADERS: {}, isAuthorized: () => false },
    "@/lib/registration-auth.server": { verifyIncomingHandshake: async () => ({ ok: true }) },
    "@/lib/key-pool.server": {
      getPoolAdmin: () => ({
        async rpc() {
          rpcCalls++;
          return { data: "test-pool-reference", error: null };
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: { id: "test-worker-reference" }, error: null }),
              }),
            }),
          }),
        }),
      }),
    },
  });
  return {
    async send() {
      return Route.server.handlers.POST({
        request: new Request("https://parent.lovable.app/api/public/v1/workers/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            api_key: "test-only-api-key",
            project_origin: "https://test.lovable.app",
          }),
        }),
      });
    },
    rpcCalls: () => rpcCalls,
  };
}
for (const status of [401, 403, 500, 503]) {
  test(`registration never saves a key after upstream HTTP ${status}`, async (t) => {
    const r = route(t, async () => new Response(null, { status }));
    const response = await r.send();
    assert.equal(response.status, status >= 500 ? 503 : 400);
    assert.equal(r.rpcCalls(), 0);
  });
}
test("registration never saves a key after a network error", async (t) => {
  const r = route(t, async () => {
    throw new Error("network unavailable");
  });
  assert.equal((await r.send()).status, 503);
  assert.equal(r.rpcCalls(), 0);
});
test("successful compatibility registration returns the Gator response contract", async (t) => {
  const r = route(t, async (_url, init) => {
    assert.equal(init.redirect, "error");
    assert.ok(init.signal);
    return new Response("{}");
  });
  const response = await r.send();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    registered: true,
    worker_id: "test-worker-reference",
    status: "active",
  });
  assert.equal(r.rpcCalls(), 1);
});

test("compatibility receiver limits repeated origin probes before calling upstream", async (t) => {
  let probes = 0;
  const r = route(t, async () => {
    probes++;
    return new Response("{}");
  });
  for (let i = 0; i < 3; i++) assert.equal((await r.send()).status, 200);
  assert.equal((await r.send()).status, 429);
  assert.equal(probes, 3);
  assert.equal(r.rpcCalls(), 3);
});
