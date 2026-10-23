const test = require("node:test"),
  assert = require("node:assert/strict");
test("GitHub accepts public OAuth app IDs and rejects credentials", async () => {
  const { githubDefinitions } = await import("../scripts/github-desktop-mcp.mjs");
  for (const id of ["0123456789abcdef0123", "Ov23li0123456789abcd"])
    assert.equal(githubDefinitions(id)[0].entry.clientId, id);
  for (const id of [
    undefined,
    "",
    "ghp_not-a-client-id",
    "gho_not-a-client-id",
    "a".repeat(40),
    "a b",
    "https://github.com",
  ])
    assert.throws(() => githubDefinitions(id), /Client ID/);
});
