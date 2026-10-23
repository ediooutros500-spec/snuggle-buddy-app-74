const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  os = require("node:os"),
  path = require("node:path"),
  load = require("./load-typescript.cjs");
test("client access persists expiry and device enrollment, serializes concurrent first use, and fails closed", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-access-"));
  const before = { role: process.env.GATEWAY_ROLE, dir: process.env.GATOR_ADMIN_DATA_DIR },
    clock = Date.now;
  Object.assign(process.env, { GATEWAY_ROLE: "central", GATOR_ADMIN_DATA_DIR: dir });
  t.after(async () => {
    Date.now = clock;
    if (before.role === undefined) delete process.env.GATEWAY_ROLE;
    else process.env.GATEWAY_ROLE = before.role;
    if (before.dir === undefined) delete process.env.GATOR_ADMIN_DATA_DIR;
    else process.env.GATOR_ADMIN_DATA_DIR = before.dir;
    await fs.rm(dir, { recursive: true, force: true });
  });
  const access = load("src/lib/client-access.server.ts");
  const req = (id) =>
    new Request("https://api.test/v1/models", { headers: id ? { "x-device-id": id } : {} });
  assert.throws(() => access.accessPatch({ validity_days: 2 }));
  assert.throws(() => access.accessPatch({ device_limit: -1 }));
  assert.throws(() => access.accessPatch({ device_limit: 101 }));
  await access.saveClientAccess(
    "client",
    access.accessPatch({ validity_days: 1, device_limit: 1 }),
  );
  assert.equal(await access.checkClientAccess(req(), "client"), false);
  assert.equal(await access.checkClientAccess(req("short"), "client"), false);
  const admissions = await Promise.all(
    ["device-one", "device-two", "device-three"].map((id) =>
      access.checkClientAccess(req(id), "client"),
    ),
  );
  assert.deepEqual(admissions, [true, false, false]);
  assert.equal(await access.checkClientAccess(req("device-one"), "client"), true);
  const reloaded = load("src/lib/client-access.server.ts");
  assert.equal(await reloaded.checkClientAccess(req("device-two"), "client"), false);
  let list = await reloaded.listClientAccess();
  assert.equal(list.client.device_count, 1);
  assert.equal(list.client.devices[0].requests, 2);
  assert.equal(JSON.stringify(list).includes("device-one"), false);
  await access.saveClientAccess("client", {}, true);
  assert.equal(await access.checkClientAccess(req("device-two"), "client"), true);
  Date.now = () => clock() + 2 * 86400000;
  assert.equal(await access.checkClientAccess(req("device-two"), "client"), false);
  Date.now = clock;
  await access.saveClientAccess("legacy", access.accessPatch({ device_limit: 0 }));
  assert.equal(await access.checkClientAccess(req(), "legacy"), true);
  assert.equal((await access.listClientAccess()).legacy.unidentified_requests, 1);
  await access.checkClientAccess(req("dry-run-device"), "legacy", false);
  assert.equal((await access.listClientAccess()).legacy.device_count, 0);
  const raw = await fs.readFile(path.join(dir, "client-access.json"), "utf8");
  assert.equal(raw.includes("device-two"), false);
  await fs.writeFile(path.join(dir, "client-access.json"), "corrupted");
  await assert.rejects(() => access.checkClientAccess(req(), "legacy"));
});
