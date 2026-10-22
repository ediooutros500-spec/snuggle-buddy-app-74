const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs");

const secret = "test-only-secret";
const key = "test-only-lovable-key";
const origin = "https://child-test.lovable.app";
const workerId = "11111111-1111-4111-8111-111111111111";

function setup(t, fetcher, pool = null) {
  const names = [
    "GATOR_PUBLIC_URL",
    "PARENT_GATEWAY_URL",
    "REMIX_SYNC_SECRET",
    "LOVABLE_API_KEY",
    "NODE_ENV",
    "GATEWAY_ROLE",
  ];
  const before = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  const oldFetch = global.fetch;
  Object.assign(process.env, {
    GATOR_PUBLIC_URL: "https://gator.example.test",
    REMIX_SYNC_SECRET: secret,
    LOVABLE_API_KEY: key,
    NODE_ENV: "production",
    GATEWAY_ROLE: "child",
  });
  delete process.env.PARENT_GATEWAY_URL;
  if (fetcher) global.fetch = fetcher;
  t.after(() => {
    global.fetch = oldFetch;
    for (const name of names) {
      if (before[name] === undefined) delete process.env[name];
      else process.env[name] = before[name];
    }
  });
  return load("src/lib/child-handshake.server.ts", {
    "./key-pool.server": { getPoolAdmin: () => pool },
  });
}
function success() {
  return new Response(JSON.stringify({ registered: true, worker_id: workerId }), { status: 200 });
}

test("child HMAC is accepted by the actual Gator receiver without transmitting the shared secret", async (t) => {
  const { createRegistration } = await import("../gator/src/registration.mjs");
  const seen = new Set();
  const register = createRegistration({
    secret,
    store: {
      async claimNonce(nonce) {
        if (seen.has(nonce)) return false;
        seen.add(nonce);
        return true;
      },
      async register() {
        return workerId;
      },
    },
    validateKey: async () => "active",
  });
  let calls = 0;
  const child = setup(t, async (url, init) => {
    calls++;
    assert.equal(url, "https://gator.example.test/api/public/v1/workers/register");
    assert.equal(init.headers["x-remix-sync-token"], undefined);
    assert.equal(Object.values(init.headers).includes(secret), false);
    assert.equal(init.redirect, "error");
    const result = await register(init.headers, JSON.parse(init.body));
    assert.equal(result.status, 200);
    return new Response(JSON.stringify(result.body), { status: result.status });
  });
  assert.equal((await child.triggerChildHandshake(`${origin}/first`)).registered, true);
  assert.equal((await child.triggerChildHandshake(`${origin}/second`)).registered, true);
  assert.equal(calls, 1);
});
test("failed or unconfirmed registration is never cached as success", async (t) => {
  let calls = 0;
  const child = setup(t, async () => {
    calls++;
    return calls === 1 ? new Response("{}") : success();
  });
  assert.equal((await child.triggerChildHandshake(origin)).registered, false);
  assert.equal((await child.triggerChildHandshake(origin)).registered, true);
  assert.equal(calls, 2);
});
test("simultaneous child requests share one registration", async (t) => {
  let calls = 0;
  let finish;
  const child = setup(t, () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const first = child.triggerChildHandshake(origin);
  const second = child.triggerChildHandshake(origin);
  finish(success());
  assert.equal((await first).registered, true);
  assert.equal((await second).registered, true);
  assert.equal(calls, 1);
});
test("parent and local requests do not mark a child as registered", async (t) => {
  let calls = 0;
  const child = setup(t, async () => {
    calls++;
    return success();
  });
  assert.equal(
    (await child.triggerChildHandshake("https://snuggle-buddy-app-74.lovable.app")).registered,
    false,
  );
  assert.equal((await child.triggerChildHandshake("http://localhost:3000")).registered, false);
  assert.equal((await child.triggerChildHandshake(origin)).registered, true);
  assert.equal(calls, 1);
});
for (const destination of [
  "",
  "http://gator.example.test",
  "http://127.0.0.1:20128",
  "https://user:password@gator.example.test",
  "https://gator.example.test/path",
]) {
  test(`production rejects unsafe or missing destination: ${destination}`, async (t) => {
    const child = setup(t, () => {
      assert.fail("must not send credentials");
    });
    process.env.GATOR_PUBLIC_URL = destination;
    assert.equal((await child.triggerChildHandshake(origin)).attempted, false);
  });
}
test("nonce persistence errors block the compatibility receiver", async (t) => {
  const child = setup(t, null, {
    from: () => ({ insert: async () => ({ error: { code: "XX000" } }) }),
  });
  const cfg = load("src/lib/child-config.server.ts");
  const headers = cfg.createSignedHandshakeHeaders(secret, origin, key);
  const result = await child.verifyIncomingHandshake(new Request(origin, { headers }), key, origin);
  assert.equal(result.ok, false);
});
test("shared token alone is rejected by the compatibility receiver", async (t) => {
  const child = setup(t);
  const result = await child.verifyIncomingHandshake(
    new Request(origin, { headers: { "x-remix-sync-token": secret } }),
    key,
    origin,
  );
  assert.equal(result.ok, false);
});
test("compatibility receiver accepts HMAC once and rejects a persistent duplicate", async (t) => {
  let count = 0;
  const child = setup(t, null, {
    from: () => ({ insert: async () => ({ error: ++count === 1 ? null : { code: "23505" } }) }),
  });
  const cfg = load("src/lib/child-config.server.ts");
  const request = new Request(origin, {
    headers: cfg.createSignedHandshakeHeaders(secret, origin, key),
  });
  assert.equal((await child.verifyIncomingHandshake(request, key, origin)).ok, true);
  assert.equal((await child.verifyIncomingHandshake(request, key, origin)).ok, false);
});

test("central parent never registers itself even when forced", async (t) => {
  const child = setup(t, () => {
    assert.fail("central parent must not send a key");
  });
  process.env.GATEWAY_ROLE = "central";
  assert.equal((await child.triggerChildHandshake(origin, true)).attempted, false);
});
