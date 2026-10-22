const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs");
const settings = {
  default_model: "google/gemini-3.6-flash",
  disabled_models: [],
  global_rate_limit_rpm: 120,
  cooldown_minutes: 15,
};
const auth = (id = "client-1") => ({
  authorized: true,
  isAdmin: false,
  client: { id, name: "Test", allowed_models: ["google/gemini-3.6-flash"], rate_limit_rpm: 60 },
});
function fixture({ limit = 3, used = 0, databaseFailure = false } = {}) {
  const row = {
    id: "client-1",
    status: "active",
    total_requests: used,
    quota_limit_requests: limit,
  };
  let admissions = 0;
  const pool = {
    from(table) {
      let patch,
        filters = [];
      const query = {
        select() {
          if (patch)
            return Promise.resolve().then(() => {
              if (databaseFailure)
                return { data: null, error: { message: "private database error" } };
              if (filters.every(([key, value]) => row[key] === value)) {
                Object.assign(row, patch);
                admissions++;
                return { data: [{ id: row.id }], error: null };
              }
              return { data: [], error: null };
            });
          return query;
        },
        eq(key, value) {
          filters.push([key, value]);
          return query;
        },
        is(key, value) {
          filters.push([key, value]);
          return query;
        },
        update(value) {
          patch = value;
          return query;
        },
        single: async () =>
          databaseFailure
            ? { data: null, error: {} }
            : { data: table === "gateway_settings" ? { ...settings } : { ...row }, error: null },
      };
      return query;
    },
  };
  const policy = load("src/lib/gateway-policy.server.ts", {
    "./key-pool.server": { getPoolAdmin: () => pool },
  });
  return { policy, pool, row, admissions: () => admissions };
}
test("disabled default, aliases and inferred fallback cannot bypass model block", () => {
  const compat = load("src/lib/claude-compat.server.ts", {
    "./key-pool.server": { getPoolAdmin: () => null },
  });
  assert.equal(compat.resolveModel(undefined, ["google/gemini-3.6-flash"]), null);
  assert.equal(compat.resolveModel("claude-unknown-sonnet", ["openai/gpt-5.6-sol"]), null);
  assert.equal(compat.resolveModel("gpt-unknown", ["google/gemini-3.6-flash"]), null);
  assert.equal(compat.resolveModel("gpt-4o", ["openai/gpt-5.6-sol"]), null);
  assert.equal(compat.resolveModel(undefined, [], "openai/gpt-5.6-sol"), "openai/gpt-5.6-sol");
});
test("settings patch preserves omitted block list and rejects unsupported or unsafe fields", () => {
  const { policy } = fixture();
  assert.deepEqual(policy.settingsPatch({ action: "settings", global_rate_limit_rpm: 15 }), {
    global_rate_limit_rpm: 15,
  });
  for (const value of [0, -1, 1.5, null, "20", 10001])
    assert.throws(() => policy.settingsPatch({ global_rate_limit_rpm: value }));
  assert.throws(() => policy.settingsPatch({ cooldown_minutes: 7 }));
  assert.throws(() => policy.settingsPatch({ default_model: "openai/gpt-image-2.5-sunburst" }));
  assert.throws(() => policy.settingsPatch({ disabled_models: ["not-a-model"] }));
});
test("one global limiter is shared between clients without trusting forwarded addresses", () => {
  const { policy } = fixture();
  policy.enforcePolicyRate(auth("a"), { ...settings, global_rate_limit_rpm: 1 });
  assert.throws(
    () => policy.enforcePolicyRate(auth("b"), { ...settings, global_rate_limit_rpm: 1 }),
    (error) => error.status === 429,
  );
});
test("one client limiter is shared across modalities and not shared with another client", () => {
  const { policy } = fixture();
  policy.enforcePolicyRate(
    { ...auth("a"), client: { ...auth("a").client, rate_limit_rpm: 1 } },
    settings,
  );
  assert.throws(
    () =>
      policy.enforcePolicyRate(
        { ...auth("a"), client: { ...auth("a").client, rate_limit_rpm: 1 } },
        settings,
      ),
    (e) => e.status === 429,
  );
  assert.doesNotThrow(() => policy.enforcePolicyRate(auth("b"), settings));
});
test("zero and exhausted client quotas refuse admission before generation", async () => {
  for (const values of [
    { limit: 0, used: 0 },
    { limit: 2, used: 2 },
  ]) {
    const f = fixture(values);
    await assert.rejects(
      f.policy.admitClientAttempt(auth()),
      (error) => error.status === 429 && error.code === "insufficient_quota",
    );
    assert.equal(f.admissions(), 0);
  }
});
test("concurrent requests cannot exceed a single remaining database quota slot", async () => {
  const f = fixture({ limit: 3, used: 2 });
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, () => f.policy.admitClientAttempt(auth())),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(f.admissions(), 1);
  assert.equal(f.row.total_requests, 3);
  assert.ok(results.filter((r) => r.status === "rejected").every((r) => r.reason.status === 429));
});
test("quota is read again after policy process reload and suspension fails closed", async () => {
  const f = fixture({ limit: 1 });
  await f.policy.admitClientAttempt(auth());
  const reloaded = load("src/lib/gateway-policy.server.ts", {
    "./key-pool.server": { getPoolAdmin: () => f.pool },
  });
  await assert.rejects(reloaded.admitClientAttempt(auth()), (e) => e.status === 429);
  f.row.status = "suspended";
  await assert.rejects(f.policy.admitClientAttempt(auth()), (e) => e.status === 401);
});

test("client creation and editing share numeric and model validation", () => {
  const { policy } = fixture();
  assert.equal(
    policy.clientPatch({ name: "Test", quota_limit_requests: 0 }, true).quota_limit_requests,
    0,
  );
  for (const rpm of [0, -1, 1.5, "60", 10001])
    assert.throws(() => policy.clientPatch({ name: "Test", rate_limit_rpm: rpm }, true));
  for (const quota of [-1, 1.5, "10", Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => policy.clientPatch({ quota_limit_requests: quota }));
  assert.throws(() => policy.clientPatch({ allowed_models: ["fake-model"] }));
  assert.throws(() => policy.clientPatch({}));
});
test("database errors block generation instead of bypassing quotas or settings", async () => {
  const f = fixture({ databaseFailure: true });
  await assert.rejects(f.policy.admitClientAttempt(auth()), (e) => e.status === 503);
  await assert.rejects(f.policy.readGatewaySettings(), (e) => e.status === 503);
});
for (const [route, body] of [
  ["images/generations", { model: "openai/gpt-image-2.5-sunburst", prompt: "audit" }],
  ["embeddings", { model: "openai/text-embedding-3-small", input: "audit" }],
  ["videos/generations", { model: "google/veo-3.1-fast", prompt: "audit" }],
])
  test(`${route} blocks client model restrictions and global blocks before forwarding`, async () => {
    for (const globalBlock of [false, true]) {
      let forwarded = 0,
        quotaWrites = 0;
      const client = globalBlock
        ? { ...auth(), client: { ...auth().client, allowed_models: null } }
        : auth();
      const current = { ...settings, disabled_models: globalBlock ? [body.model] : [] };
      const { Route } = load("src/routes/api/public/v1/" + route + ".ts", {
        "@tanstack/react-router": { createFileRoute: () => (c) => c },
        "./claude-compat.server": {
          authenticateGatewayRequest: async () => client,
          ALLOWED_MODELS: ["google/gemini-3.6-flash"],
          MODEL_ALIASES: {},
          DEFAULT_MODEL: "google/gemini-3.6-flash",
          CORS_HEADERS: {},
        },
        "./key-pool.server": {
          getPoolAdmin: () => ({
            from: () => ({
              select: () => ({
                eq: () => ({ single: async () => ({ data: current, error: null }) }),
              }),
              update: () => {
                quotaWrites++;
                assert.fail("Forbidden model cannot reserve quota");
              },
            }),
          }),
          fetchGatewayWithFailover: async () => {
            forwarded++;
            assert.fail("Forbidden model cannot reach upstream");
          },
        },
      });
      const response = await Route.server.handlers.POST({
        request: new Request("https://api.example.test/api/public/v1/" + route, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      });
      assert.equal(response.status, 403);
      assert.equal(forwarded, 0);
      assert.equal(quotaWrites, 0);
    }
  });
test("text default uses stored setting and refuses exhausted quota before provider selection", async () => {
  let forwarded = 0;
  const { Route } = load("src/routes/api/public/v1/chat/completions.ts", {
    "@tanstack/react-router": { createFileRoute: () => (c) => c },
    "@/lib/claude-compat.server": {
      authenticateGatewayRequest: async () => auth(),
      CORS_HEADERS: {},
      MAX_BODY_BYTES: 2000000,
      MAX_MESSAGES: 200,
      MAX_TOTAL_CHARS: 1500000,
    },
    "@/lib/gateway-policy.server": {
      readGatewaySettings: async () => settings,
      resolvePolicyModel: () => settings.default_model,
      admitModelAttempt: async () => {
        throw new (class extends Error {
          status = 429;
          code = "insufficient_quota";
        })();
      },
      policyErrorResponse: () => new Response("{}", { status: 429 }),
    },
    "@/lib/key-pool.server": {
      getPoolAdmin: () => null,
      fetchGatewayWithFailover: async () => {
        forwarded++;
      },
    },
  });
  const response = await Route.server.handlers.POST({
    request: new Request("https://api.example.test/api/public/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "audit" }] }),
    }),
  });
  assert.equal(response.status, 429);
  assert.equal(forwarded, 0);
});
test("legacy central routes cannot consume provider credits", async (t) => {
  const previous = process.env.GATEWAY_ROLE;
  process.env.GATEWAY_ROLE = "central";
  t.after(() => {
    if (previous === undefined) delete process.env.GATEWAY_ROLE;
    else process.env.GATEWAY_ROLE = previous;
  });
  for (const [route, method] of [
    ["ai-chat", "POST"],
    ["ai-models", "GET"],
  ]) {
    const { Route } = load("src/routes/api/public/" + route + ".ts", {
      "@tanstack/react-router": { createFileRoute: () => (c) => c },
      "@/lib/key-pool.server": {
        fetchGatewayWithFailover: () => assert.fail("Legacy central route cannot call upstream"),
      },
    });
    assert.equal(
      (
        await Route.server.handlers[method]({
          request: new Request("https://panel.example.test/api/public/" + route, {
            method,
            ...(method === "POST" ? { body: "{}" } : {}),
          }),
        })
      ).status,
      410,
    );
  }
});
