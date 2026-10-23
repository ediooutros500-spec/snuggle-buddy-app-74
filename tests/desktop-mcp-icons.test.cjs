const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const manifest = require("../backend/mcp/icons.json");
test("Remote connector icons are embedded PNGs within Claude limits", () => {
  assert.equal(Object.keys(manifest.connectors).length, 38);
  for (const row of Object.values(manifest.connectors)) {
    assert.ok(row.icon.length <= 4096);
    assert.ok(row.source.startsWith("https://"));
    const png = Buffer.from(row.icon.split(",")[1], "base64");
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.ok(png.readUInt32BE(16) <= 48 && png.readUInt32BE(20) <= 48);
  }
  const google = [
    "Gmail",
    "Google Drive",
    "Google Calendar",
    "Google Docs",
    "Google Sheets",
    "Google Slides",
  ].map((name) => manifest.connectors[name].icon);
  assert.equal(new Set(google).size, 6);
});
test("Applying icons preserves credentials and connections and is idempotent", async () => {
  const { configureDesktopMcpIcons, withConnectorIcon } =
    await import("../scripts/desktop-mcp-icons.mjs");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-icons-"));
  try {
    const id = "00000000-0000-0000-0000-000000000001",
      lib = path.join(root, "configLibrary");
    fs.mkdirSync(lib);
    fs.writeFileSync(path.join(lib, "_meta.json"), JSON.stringify({ appliedId: id }));
    const file = path.join(lib, id + ".json"),
      original = {
        inferenceProvider: "gateway",
        inferenceGatewayBaseUrl: "https://api.delvertokens.store",
        inferenceGatewayApiKey: "fake-test-key",
        managedMcpServers: [
          {
            name: "Google Drive",
            transport: "http",
            url: "https://drivemcp.googleapis.com/mcp/v1",
            oauth: { clientSecret: "fake-private-test", callbackPort: 53302 },
          },
          { name: "GitHub", server: "github", clientId: "fake-test-id" },
          { name: "Custom", transport: "http", url: "https://example.test/mcp" },
        ],
      };
    fs.writeFileSync(file, JSON.stringify(original));
    assert.deepEqual(configureDesktopMcpIcons(root).updated, ["Google Drive"]);
    assert.deepEqual(JSON.parse(fs.readFileSync(file)), original);
    const report = configureDesktopMcpIcons(root, true);
    assert.deepEqual(report.native, ["GitHub"]);
    assert.deepEqual(report.missing, ["Custom"]);
    const changed = JSON.parse(fs.readFileSync(file));
    delete changed.managedMcpServers[0].icon;
    assert.deepEqual(changed, original);
    const backups = fs.readdirSync(path.join(root, "gateway-mcp-backups"));
    assert.equal(backups.length, 1);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(root, "gateway-mcp-backups", backups[0]))),
      original,
    );
    assert.equal(configureDesktopMcpIcons(root, true).applied, false);
    assert.equal(withConnectorIcon(original.managedMcpServers[1]), original.managedMcpServers[1]);
    changed.inferenceGatewayBaseUrl = "https://other.test";
    fs.writeFileSync(file, JSON.stringify(changed));
    assert.throws(() => configureDesktopMcpIcons(root, true), /não usa o nosso gateway/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
