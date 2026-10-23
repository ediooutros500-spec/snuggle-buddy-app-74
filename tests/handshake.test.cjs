const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs");

const secret = "test-only-secret";
const key = "test-only-lovable-key";
const origin = "https://child-test.lovable.app";
const workerId = "11111111-1111-4111-8111-111111111111";

function setup(t, fetcher, pool = null, extra = {}) {
  const names = [
    "GATOR_PUBLIC_URL",
    "PARENT_GATEWAY_URL",
    "REMIX_SYNC_SECRET",
    "LOVABLE_API_KEY",
    "NODE_ENV",
    "GATEWAY_ROLE",
    "GATOR_REGISTRATION_MODE",
  ];
  const before = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  const oldFetch = global.fetch;
  Object.assign(process.env, {
    GATOR_PUBLIC_URL: "https://gator.example.test",
    REMIX_SYNC_SECRET: secret,
    LOVABLE_API_KEY: key,
    NODE_ENV: "production",
    GATEWAY_ROLE: "child",
    GATOR_REGISTRATION_MODE: "signed",
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
  const overrides = {
    "./key-pool.server": { getPoolAdmin: () => pool },
    "./central-address": { CENTRAL_REGISTRATION_ORIGIN: "" },
    ...extra,
  };
  return {
    ...load("src/lib/child-handshake.server.ts", overrides),
    ...load("src/lib/registration-auth.server.ts", overrides),
  };
}
function success() {
  return new Response(JSON.stringify({ registered: true, worker_id: workerId }), { status: 200 });
}

test("project diagnostic exposes no credentials and reports only confirmed registration", async (t) => {
  const child = setup(t, async () => success());
  const before = child.getChildRegistrationStatus(origin);
  assert.equal(before.role, "child");
  assert.equal(before.ready, true);
  assert.equal(before.registered, false);
  assert.equal(JSON.stringify(before).includes(key), false);
  assert.equal(JSON.stringify(before).includes(secret), false);
  await child.triggerChildHandshake(origin);
  assert.equal(child.getChildRegistrationStatus(origin).registered, true);
  process.env.GATEWAY_ROLE = "central";
  assert.deepEqual(child.getChildRegistrationStatus(origin), {
    role: "central",
    protocolVersion: 1,
  });
});

test("unprovisioned remix is diagnosed without probing or returning a provider key", async (t) => {
  const child = setup(t, async () => assert.fail("No upstream call allowed"));
  delete process.env.LOVABLE_API_KEY;
  const status = child.getChildRegistrationStatus(origin);
  assert.equal(status.reason, "missing_key");
  assert.equal(status.keyAvailable, false);
  assert.equal(status.ready, false);
  assert.equal((await child.triggerChildHandshake(origin)).attempted, false);
  assert.equal(
    child.getChildRegistrationStatus("http://localhost:3000").reason,
    "unsupported_origin",
  );
});

test("child HMAC is accepted by the actual Gator receiver without transmitting the shared secret", async (t) => {
  const { createRegistration } = await import("../gator/src/registration.mjs");
  const seen = new Set();
  const register = createRegistration({
    secret,
    mode: "signed",
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
    assert.equal(init.redirect, "manual");
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
test("an existing Lovable project can register; local URLs are ignored", async (t) => {
  let calls = 0;
  const child = setup(t, async () => {
    calls++;
    return success();
  });
  assert.equal(
    (await child.triggerChildHandshake("https://snuggle-buddy-app-74.lovable.app")).registered,
    true,
  );
  assert.equal((await child.triggerChildHandshake("http://localhost:3000")).registered, false);
  assert.equal((await child.triggerChildHandshake(origin)).registered, true);
  assert.equal(calls, 2);
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

test("automatic remix inherits the central address and registers without a secret", async (t) => {
  const { createRegistration } = await import("../gator/src/registration.mjs");
  let stored = 0;
  const receive = createRegistration({
    store: {
      async register(receivedKey) {
        assert.equal(receivedKey, key);
        stored++;
        return workerId;
      },
    },
    validateKey: async () => "active",
  });
  const child = setup(
    t,
    async (url, init) => {
      assert.equal(url, "https://gator.example.test/api/public/v1/workers/register");
      assert.equal(init.headers["x-remix-sync-token"], undefined);
      assert.equal(init.headers["x-handshake-signature"], undefined);
      const result = await receive(init.headers, JSON.parse(init.body));
      return new Response(JSON.stringify(result.body), { status: result.status });
    },
    null,
    { "./central-address": { CENTRAL_REGISTRATION_ORIGIN: "https://gator.example.test" } },
  );
  delete process.env.REMIX_SYNC_SECRET;
  delete process.env.GATOR_REGISTRATION_MODE;
  delete process.env.GATOR_PUBLIC_URL;
  assert.equal((await child.triggerChildHandshake(origin)).registered, true);
  assert.equal(stored, 1);
});

test("blank environment URLs do not hide the inherited central address", async (t) => {
  const child = setup(
    t,
    async (url) => {
      assert.equal(url, "https://gator.example.test/api/public/v1/workers/register");
      return success();
    },
    null,
    { "./central-address": { CENTRAL_REGISTRATION_ORIGIN: "https://gator.example.test" } },
  );
  process.env.GATOR_REGISTRATION_MODE = "auto";
  process.env.GATOR_PUBLIC_URL = "  ";
  process.env.PARENT_GATEWAY_URL = "";
  delete process.env.REMIX_SYNC_SECRET;
  assert.equal((await child.triggerChildHandshake(origin)).registered, true);
});

test("registration refuses redirects without forwarding a credential or caching success", async (t) => {
  let calls = 0;
  const child = setup(t, async (url, init) => {
    assert.equal(url, "https://gator.example.test/api/public/v1/workers/register");
    assert.equal(init.redirect, "manual");
    calls++;
    return calls === 1
      ? new Response(null, {
          status: 307,
          headers: { location: "https://untrusted.example/collect" },
        })
      : success();
  });
  const rejected = await child.triggerChildHandshake(origin);
  assert.equal(rejected.registered, false);
  assert.match(rejected.message, /redirecionamento/);
  assert.equal(calls, 1);
  assert.equal((await child.triggerChildHandshake(origin)).registered, true);
  assert.equal(calls, 2);
});

test("registration reports receiver failures without reflecting arbitrary sensitive response text", async (t) => {
  let calls = 0;
  const child = setup(
    t,
    async () =>
      new Response(
        JSON.stringify({
          error: ++calls === 1 ? "upstream_validation_unavailable" : key,
          details: secret,
        }),
        { status: 503 },
      ),
  );
  const known = await child.triggerChildHandshake(origin);
  assert.match(known.message, /HTTP 503/);
  assert.match(known.message, /validar a chave/);
  const unknown = await child.triggerChildHandshake(origin);
  assert.equal(unknown.registered, false);
  assert.equal(JSON.stringify(unknown).includes(key), false);
  assert.equal(JSON.stringify(unknown).includes(secret), false);
});
