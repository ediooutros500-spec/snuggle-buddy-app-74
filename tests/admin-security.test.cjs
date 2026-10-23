const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const load = require("./load-typescript.cjs");

test("administrative sessions enforce roles, origin, logout and persistent account revocation", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-admin-test-"));
  const keys = [
    "GATEWAY_ROLE",
    "PARENT_PUBLIC_URL",
    "GATOR_ADMIN_DATA_DIR",
    "GATOR_ADMIN_BOOTSTRAP_PASSWORD_HASH",
    "GATOR_ALLOW_LEGACY_ADMIN_TOKEN",
  ];
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  t.after(async () => {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
    await fs.rm(directory, { recursive: true, force: true });
  });
  const store = load("src/lib/admin-store.server.ts");
  const password = "test-only-long-password-123";
  Object.assign(process.env, {
    GATEWAY_ROLE: "central",
    PARENT_PUBLIC_URL: "https://panel.example.test",
    GATOR_ADMIN_DATA_DIR: directory,
    GATOR_ADMIN_BOOTSTRAP_PASSWORD_HASH: await store.hashAdminPassword(password),
    GATOR_ALLOW_LEGACY_ADMIN_TOKEN: "false",
  });
  assert.deepEqual(await store.nameGatewayAccounts(["account-a", "account-b"]), {
    "account-a": "Conta 1",
    "account-b": "Conta 2",
  });
  assert.deepEqual(await store.nameGatewayAccounts(["account-b", "account-c"]), {
    "account-b": "Conta 2",
    "account-c": "Conta 3",
  });
  const auth = load("src/lib/admin-auth.server.ts", { "./admin-store.server": store });
  const request = (method = "GET", cookie, body, origin = "https://panel.example.test") =>
    new Request("https://panel.example.test/api/admin/session", {
      method,
      headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  async function login(username, pass = password) {
    const response = await auth.handleAdminSession(
      request("POST", null, { username, password: pass }),
    );
    assert.equal(response.status, 200);
    const header = response.headers.get("set-cookie");
    assert.match(header, /HttpOnly; Secure; SameSite=Strict/);
    assert.equal(header.includes(password), false);
    const json = await response.json();
    assert.equal(JSON.stringify(json).includes("passwordHash"), false);
    return { cookie: header.split(";")[0], user: json.user };
  }
  assert.equal(
    (
      await auth.handleAdminSession(
        request("POST", null, { username: "admin", password }, "https://evil.example"),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await auth.handleAdminSession(
        request("POST", null, { username: "admin", password: "incorrect" }),
      )
    ).status,
    401,
  );
  const owner = await login("admin");
  assert.equal((await auth.authorizeAdmin(request("GET", owner.cookie), "security")).ok, true);
  assert.equal(
    (await auth.authorizeAdmin(request("POST", owner.cookie, {}, "https://evil.example"), "write"))
      .status,
    403,
  );
  assert.equal(
    (await auth.authorizeAdmin(request("GET", "__Host-gateway_admin=" + "0".repeat(64)))).ok,
    false,
  );
  const viewer = await store.createAdminUser(owner.user.id, "viewer", password, "viewer");
  const viewerSession = await login("viewer");
  assert.equal((await auth.authorizeAdmin(request("GET", viewerSession.cookie), "read")).ok, true);
  assert.equal(
    (await auth.authorizeAdmin(request("POST", viewerSession.cookie, {}), "write")).status,
    403,
  );
  assert.equal(
    (await auth.authorizeAdmin(request("GET", viewerSession.cookie), "security")).status,
    403,
  );
  const operator = await store.createAdminUser(owner.user.id, "operator", password, "operator");
  const operatorSession = await login("operator");
  assert.equal(
    (await auth.authorizeAdmin(request("POST", operatorSession.cookie, {}), "write")).ok,
    true,
  );
  assert.equal(
    (await auth.authorizeAdmin(request("GET", operatorSession.cookie), "security")).status,
    403,
  );
  await store.updateAdminUser(owner.user.id, operator.id, {
    password: "changed-long-password-123",
  });
  assert.equal((await auth.authorizeAdmin(request("GET", operatorSession.cookie))).ok, false);
  await store.updateAdminUser(owner.user.id, viewer.id, { enabled: false });
  assert.equal((await auth.authorizeAdmin(request("GET", viewerSession.cookie))).ok, false);
  await assert.rejects(
    store.updateAdminUser(owner.user.id, owner.user.id, { enabled: false }),
    /last_admin/,
  );
  const persisted = await fs.readFile(path.join(directory, "accounts.json"), "utf8");
  assert.equal(persisted.includes(password), false);
  assert.equal(persisted.includes("changed-long-password-123"), false);
  assert.ok((await store.listAdminAudit()).length >= 5);
  const reloaded = load("src/lib/admin-store.server.ts");
  assert.equal((await reloaded.listAdminUsers()).length, 3);
  assert.equal((await auth.handleAdminSession(request("DELETE", owner.cookie))).status, 200);
  assert.equal((await auth.authorizeAdmin(request("GET", owner.cookie))).ok, false);
  const fresh = await login("admin");
  const realNow = Date.now;
  try {
    const at = realNow();
    Date.now = () => at + 31 * 60 * 1000;
    assert.equal((await auth.authorizeAdmin(request("GET", fresh.cookie))).ok, false);
  } finally {
    Date.now = realNow;
  }
});

test("client key verifier stores only a digest and safe hint", () => {
  const keys = load("src/lib/client-keys.server.ts");
  const key = keys.createClientKey();
  const stored = keys.storedClientKey(key);
  assert.match(key, /^gw_[a-f0-9]{64}$/);
  assert.equal(stored.includes(key), false);
  assert.equal(stored, keys.storedClientKey(key));
  assert.notEqual(stored, keys.storedClientKey(keys.createClientKey()));
  assert.equal(keys.clientKeyHint(stored), keys.clientKeyHint(key));
});

test("client management returns key once, masks listings and audits rotation", async () => {
  const keys = load("src/lib/client-keys.server.ts");
  const rows = [];
  const events = [];
  const pool = {
    from: (table) => ({
      select: () =>
        table === "gateway_clients"
          ? { order: async () => ({ data: rows }) }
          : table === "gateway_settings"
            ? { eq: () => ({ single: async () => ({ data: { id: 1 } }) }) }
            : { order: () => ({ limit: async () => ({ data: [] }) }) },
      insert: (row) => ({
        select: () => ({
          single: async () => {
            const data = { ...row, id: "client-test-id" };
            rows.push(data);
            return { data, error: null };
          },
        }),
      }),
      update: (patch) => ({
        eq: (_column, id) => ({
          select: () => ({
            single: async () => {
              const row = rows.find((r) => r.id === id);
              Object.assign(row, patch);
              return { data: { id }, error: null };
            },
          }),
        }),
      }),
    }),
  };
  const { Route } = load("src/routes/api/admin/gateway.ts", {
    "@tanstack/react-router": { createFileRoute: () => (config) => config },
    "@/lib/key-pool.server": { getPoolAdmin: () => pool },
    "@/lib/admin-auth.server": {
      authorizeAdmin: async () => ({ ok: true, actorId: "admin-test" }),
    },
    "@/lib/client-access.server": {
      accessPatch: load("src/lib/client-access.server.ts").accessPatch,
      saveClientAccess: async () => {},
    },
    "@/lib/admin-store.server": { recordAdminAudit: async (...args) => events.push(args) },
  });
  const send = (method, body) =>
    Route.server.handlers[method]({
      request: new Request("https://panel.example.test/api/admin/gateway", {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    });
  const created = await (await send("POST", { name: "Test client" })).json();
  assert.ok(created.api_key.startsWith("gw_"));
  assert.equal(rows[0].client_key, keys.storedClientKey(created.api_key));
  const list = await (await send("GET")).json();
  assert.equal(JSON.stringify(list).includes(created.api_key), false);
  assert.equal(JSON.stringify(list).includes("gw_hash_v1"), false);
  const rotated = await (await send("PATCH", { id: rows[0].id, action: "rotate-key" })).json();
  assert.notEqual(rotated.api_key, created.api_key);
  assert.equal(rows[0].client_key, keys.storedClientKey(rotated.api_key));
  assert.equal(events.length, 2);
});
