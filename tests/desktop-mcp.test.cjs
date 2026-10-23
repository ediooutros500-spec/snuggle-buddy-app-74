const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
test("Desktop pilot preserves credentials, backups, other connectors and is idempotent", async () => {
  const { configureDesktopMcp } = await import("../scripts/configure-desktop-mcp.mjs");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "desktop-mcp-"));
  try {
    const id = "00000000-0000-0000-0000-000000000001",
      lib = path.join(root, "configLibrary");
    fs.mkdirSync(lib);
    fs.writeFileSync(path.join(lib, "_meta.json"), JSON.stringify({ appliedId: id }));
    const file = path.join(lib, id + ".json"),
      original = {
        inferenceProvider: "gateway",
        inferenceGatewayBaseUrl: "https://api.delvertokens.store",
        inferenceGatewayApiKey: "test-only-secret",
        managedMcpServers: [
          { name: "Existing", transport: "http", url: "https://example.test/mcp" },
        ],
      };
    fs.writeFileSync(file, JSON.stringify(original));
    assert.equal(configureDesktopMcp(root).applied, false);
    assert.deepEqual(JSON.parse(fs.readFileSync(file)), original);
    assert.equal(configureDesktopMcp(root, true).applied, true);
    const changed = JSON.parse(fs.readFileSync(file));
    assert.equal(changed.inferenceGatewayApiKey, original.inferenceGatewayApiKey);
    assert.deepEqual(changed.managedMcpServers[0], original.managedMcpServers[0]);
    assert.equal(changed.managedMcpServers[1].url, "https://mcp.context7.com/mcp");
    const backups = fs.readdirSync(path.join(root, "gateway-mcp-backups"));
    assert.equal(backups.length, 1);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(root, "gateway-mcp-backups", backups[0]))),
      original,
    );
    assert.equal(configureDesktopMcp(root, true).alreadyPresent, true);
    assert.equal(JSON.parse(fs.readFileSync(file)).managedMcpServers.length, 2);
    assert.equal(configureDesktopMcp(root, true, "notion").applied, true);
    const notion = JSON.parse(fs.readFileSync(file));
    assert.equal(notion.managedMcpServers.length, 3);
    assert.deepEqual(notion.managedMcpServers[1], changed.managedMcpServers[1]);
    assert.equal(notion.managedMcpServers[2].oauth, true);
    assert.equal(notion.inferenceGatewayApiKey, original.inferenceGatewayApiKey);
    assert.equal(configureDesktopMcp(root, true, "notion").alreadyPresent, true);
    assert.throws(() => configureDesktopMcp(root, true, "unknown"), /fora do piloto/);
    changed.inferenceGatewayBaseUrl = "https://different.test";
    fs.writeFileSync(file, JSON.stringify(changed));
    assert.throws(() => configureDesktopMcp(root, true), /não usa o nosso gateway/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
