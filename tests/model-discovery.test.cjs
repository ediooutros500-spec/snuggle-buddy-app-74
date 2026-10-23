const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-typescript.cjs");
const noPool = { "./key-pool.server": { getPoolAdmin: () => null } };
const compat = load("src/lib/claude-compat.server.ts", noPool);
const policy = load("src/lib/gateway-policy.server.ts", noPool);
async function discover(auth, settings) {
  const { Route } = load("src/routes/api/public/v1/models.ts", {
    "@tanstack/react-router": { createFileRoute: () => (x) => x },
    "@/lib/claude-compat.server": { ...compat, authenticateGatewayRequest: async () => auth },
    "@/lib/gateway-policy.server": {
      ...policy,
      readGatewaySettings: async () => settings,
      enforcePolicyRate: () => {},
    },
  });
  return Route.server.handlers.GET({ request: new Request("https://api.test/v1/models") });
}
test("discovery exposes one friendly entry per canonical model, without aliases", async () => {
  const response = await discover({ authorized: true }, { disabled_models: [] });
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.length, policy.MODEL_CATALOG.length);
  assert.equal(new Set(data.map((x) => x.id)).size, data.length);
  assert.equal(new Set(data.map((x) => x.display_name)).size, data.length);
  for (const row of data) {
    assert.equal(row.name, row.display_name);
    assert.ok(!row.display_name.includes("/"));
    assert.equal(row.owned_by, row.id.split("/")[0]);
    assert.equal(Object.hasOwn(compat.MODEL_ALIASES, row.id), false);
  }
  assert.equal(data.find((x) => x.id === "openai/gpt-6.1-sol").display_name, "GPT-6.1 Sol");
  assert.equal(
    data.find((x) => x.id === "anthropic/claude-opus-5-5").display_name,
    "Claude Opus 5.5",
  );
  assert.equal(compat.resolveModel("gpt-4o"), "openai/gpt-5.6-sol");
  assert.equal(compat.resolveModel("claude-opus-4"), "anthropic/claude-opus-5-5");
});
test("friendly discovery still enforces authentication, disabled models and alias-based client restrictions", async () => {
  assert.equal((await discover({ authorized: false }, { disabled_models: [] })).status, 401);
  const auth = {
    authorized: true,
    client: { allowed_models: ["claude-opus-4", "openai/gpt-6.1-sol"] },
  };
  const { data } = await (
    await discover(auth, { disabled_models: ["anthropic/claude-opus-5-5"] })
  ).json();
  assert.deepEqual(
    data.map((x) => x.id),
    ["openai/gpt-6.1-sol"],
  );
});
