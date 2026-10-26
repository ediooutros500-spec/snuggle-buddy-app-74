const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const load = require("./load-typescript.cjs");
function setup(t, fetcher) {
  const names = [
    "GATOR_PUBLIC_URL",
    "PARENT_GATEWAY_URL",
    "LOVABLE_API_KEY",
    "GATEWAY_ROLE",
    "GATOR_REGISTRATION_MODE",
    "NODE_ENV",
  ];
  const before = Object.fromEntries(names.map((n) => [n, process.env[n]])),
    oldFetch = global.fetch;
  Object.assign(process.env, {
    GATOR_PUBLIC_URL: "https://central.example.test",
    LOVABLE_API_KEY: "test-private-key",
    GATEWAY_ROLE: "child",
    GATOR_REGISTRATION_MODE: "auto",
    NODE_ENV: "production",
  });
  delete process.env.PARENT_GATEWAY_URL;
  global.fetch = fetcher;
  t.after(() => {
    global.fetch = oldFetch;
    for (const n of names) {
      if (before[n] === undefined) delete process.env[n];
      else process.env[n] = before[n];
    }
  });
  return load("src/lib/child-handshake.server.ts");
}
test("Child registers server-side once and exposes no credential in diagnostic", async (t) => {
  let calls = 0;
  const child = setup(t, async (url, init) => {
    calls++;
    assert.equal(url, "https://central.example.test/api/public/v1/workers/register");
    assert.equal(init.redirect, "manual");
    const body = JSON.parse(init.body);
    assert.equal(body.api_key, "test-private-key");
    assert.equal(body.project_origin, "https://remix.example.lovable.app");
    return Response.json({ registered: true, worker_id: "11111111-1111-4111-8111-111111111111" });
  });
  const origin = "https://remix.example.lovable.app";
  assert.equal((await child.triggerChildHandshake(origin)).registered, true);
  assert.equal((await child.triggerChildHandshake(origin)).attempted, false);
  assert.equal(calls, 1);
  const status = child.getChildRegistrationStatus(origin);
  assert.equal(status.registered, true);
  assert.ok(!JSON.stringify(status).includes("test-private-key"));
});
test("No registration without runtime key or for unsupported host", async (t) => {
  const child = setup(t, async () => {
    throw Error("Must not call network");
  });
  delete process.env.LOVABLE_API_KEY;
  assert.equal((await child.triggerChildHandshake("https://no-key.lovable.app")).attempted, false);
  assert.equal((await child.triggerChildHandshake("https://attacker.example")).attempted, false);
});
test("Redirect never forwards credential and network error stays structured", async (t) => {
  let calls = 0;
  const child = setup(t, async () => {
    calls++;
    return new Response(null, { status: 302, headers: { location: "https://other.example" } });
  });
  assert.equal(
    (await child.triggerChildHandshake("https://redirect.lovable.app")).registered,
    false,
  );
  assert.equal(calls, 1);
  global.fetch = async () => {
    throw Error("network private details");
  };
  const r = await child.triggerChildHandshake("https://network.lovable.app");
  assert.equal(r.registered, false);
  assert.ok(!r.message.includes("private"));
});
test("Receiver rejection is not registration success", async (t) => {
  const child = setup(t, async () =>
    Response.json({ error: "invalid_upstream_key" }, { status: 400 }),
  );
  assert.equal(
    (await child.triggerChildHandshake("https://rejected.lovable.app")).registered,
    false,
  );
});
test("Child tree has no central runtime or admin dependency", () => {
  for (const p of [
    "src/routes/api/admin",
    "src/lib/key-pool.server.ts",
    "src/components/gateway-admin.tsx",
    "deploy",
    "gator",
    "pool-setup.sql",
    "supabase/config.toml",
  ])
    assert.equal(fs.existsSync(p), false, p);
  assert.ok(
    !fs
      .readFileSync("src/routes/api/public/v1/workers/announce.ts", "utf8")
      .includes("claude-compat"),
  );
});
