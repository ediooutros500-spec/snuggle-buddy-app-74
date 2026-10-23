const test = require("node:test"),
  assert = require("node:assert/strict");
test("Google definitions require own credentials, validate redirect URLs and keep six service endpoints distinct", async () => {
  const { googleDefinitions } = await import("../scripts/google-desktop-mcp.mjs");
  assert.throws(() => googleDefinitions(null), /inválido/);
  const client = {
    client_id: "test.apps.googleusercontent.com",
    client_secret: "GOCSPX-test-only",
  };
  assert.throws(() => googleDefinitions({ web: client }), /seis retornos/);
  const entries = googleDefinitions({ installed: client });
  assert.equal(entries.length, 6);
  assert.equal(new Set(entries.map((x) => x.entry.url)).size, 6);
  assert.equal(entries[0].entry.oauth.callbackPort, 53301);
  assert.equal(entries[5].entry.oauth.callbackPort, 53306);
  assert.ok(entries.every((x) => x.entry.oauth.clientId === client.client_id));
  assert.throws(
    () => googleDefinitions({ installed: { ...client, client_id: "https://attacker.test" } }),
    /inválido/,
  );
});
