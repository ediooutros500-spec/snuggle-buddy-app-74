import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createRegistration } from "../src/registration.mjs";
import { registrationServices } from "../src/registration-services.mjs";
import { createGatorServer } from "../src/app.mjs";
import { readConfig } from "../src/config.mjs";

const secret = "test-only-handshake-secret";
const key = "test-only-worker-key";
const origin = "https://example.lovable.app";
const now = 1792688666000;
const id = "11111111-1111-4111-8111-111111111111";
function signed(body, timestamp = String(now), nonce = "test-nonce-1234567890") {
  return {
    "x-handshake-timestamp": timestamp,
    "x-handshake-nonce": nonce,
    "x-handshake-signature": createHmac("sha256", secret)
      .update(`${body.project_origin}|${timestamp}|${nonce}|${body.api_key}`)
      .digest("hex"),
  };
}
function fixture(overrides = {}) {
  const calls = [];
  const seen = new Set();
  const options = {
    secret,
    mode: "signed",
    now: () => now,
    store: {
      async claimNonce(nonce) {
        calls.push("nonce");
        if (seen.has(nonce)) return false;
        seen.add(nonce);
        return true;
      },
      async register(...args) {
        calls.push(args);
        return id;
      },
    },
    async validateKey() {
      calls.push("validate");
      return "active";
    },
    ...overrides,
  };
  return { register: createRegistration(options), calls };
}
const body = { api_key: key, project_origin: origin };

test("signed registration returns identifier without credentials and rejects replay", async () => {
  const f = fixture();
  const result = await f.register(signed(body), body);
  assert.deepEqual(result, {
    status: 200,
    body: { registered: true, worker_id: id, status: "active" },
  });
  assert.deepEqual(f.calls, ["nonce", "validate", [key, origin, "active"]]);
  assert.equal((await f.register(signed(body), body)).status, 409);
  assert.equal(f.calls.filter((c) => c === "validate").length, 1);
});
test("shared token alone cannot bypass HMAC", async () => {
  const f = fixture();
  assert.equal((await f.register({ "x-remix-sync-token": secret }, body)).status, 401);
  assert.deepEqual(f.calls, []);
});
for (const [name, headers, payload] of [
  ["tampered key", signed(body), { ...body, api_key: "different-worker-key" }],
  ["expired timestamp", signed(body, String(now - 300001)), body],
  ["future timestamp", signed(body, String(now + 300001)), body],
  ["malformed signature", { ...signed(body), "x-handshake-signature": "bad" }, body],
  ["malformed nonce", { ...signed(body), "x-handshake-nonce": "x" }, body],
])
  test(`rejects ${name} before database/upstream calls`, async () => {
    const f = fixture();
    assert.equal((await f.register(headers, payload)).status, 401);
    assert.deepEqual(f.calls, []);
  });
for (const badOrigin of [
  "http://example.lovable.app",
  "https://lovable.app.attacker.test",
  "https://localhost",
  "https://example.lovable.app/path",
  "unknown",
]) {
  test(`rejects origin ${badOrigin}`, async () => {
    const f = fixture();
    const payload = { ...body, project_origin: badOrigin };
    assert.equal((await f.register(signed(payload), payload)).status, 400);
    assert.deepEqual(f.calls, []);
  });
}
test("missing configuration fails closed", async () => {
  for (const overrides of [{ secret: "" }, { store: undefined }])
    assert.equal((await fixture(overrides).register(signed(body), body)).status, 503);
});
test("nonce database outage blocks upstream and persistence", async () => {
  const f = fixture({
    store: {
      async claimNonce() {
        throw new Error(secret);
      },
    },
  });
  const result = await f.register(signed(body), body);
  assert.deepEqual(result, { status: 503, body: { error: "registration_unavailable" } });
  assert.deepEqual(f.calls, []);
});
for (const [upstream, expected] of [
  ["invalid", 400],
  ["unavailable", 503],
  ["exhausted", 200],
]) {
  test(`handles upstream ${upstream}`, async () => {
    const f = fixture({ validateKey: async () => upstream });
    const result = await f.register(signed(body), body);
    assert.equal(result.status, expected);
    assert.equal(f.calls.length, expected === 200 ? 2 : 1);
    if (expected === 200) assert.equal(result.body.status, "exhausted");
  });
}
test("REST adapter uses privileged key only for Supabase and invokes encryption RPC", async () => {
  const requests = [];
  const services = registrationServices(
    {
      GATOR_SUPABASE_URL: "https://example.supabase.co",
      GATOR_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
      REMIX_SYNC_SECRET: secret,
    },
    async (url, init) => {
      requests.push({ url: String(url), ...init });
      if (String(url).includes("/gateway_workers?"))
        return new Response(JSON.stringify([{ id }]), { status: 200 });
      return new Response(String(url).endsWith("register_worker_key") ? JSON.stringify(id) : null, {
        status: 201,
      });
    },
  );
  assert.equal(await services.store.claimNonce("nonce", origin), true);
  assert.equal(await services.store.register(key, origin, "active"), id);
  assert.equal(requests[0].headers.apikey, "sb_secret_test");
  assert.equal(requests[0].headers.authorization, undefined);
  assert.deepEqual(JSON.parse(requests[1].body), {
    p_api_key: key,
    p_origin: origin,
    p_status: "active",
    p_error: null,
  });
  assert.equal(requests[1].redirect, "error");
});
test("HTTP health, registration, payload limits and rate limit", async (t) => {
  const f = fixture();
  const server = createGatorServer(readConfig({}), f.register);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const url = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${url}/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("access-control-allow-origin"), null);
  assert.equal((await health.json()).configured.supabase, false);
  assert.equal((await fetch(`${url}/missing`)).status, 404);
  const endpoint = `${url}/api/public/v1/workers/register`;
  const send = (payload, headers = {}) =>
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: payload,
    });
  assert.equal((await send(JSON.stringify(body), signed(body))).status, 200);
  assert.equal((await send("{")).status, 400);
  assert.equal((await send("x".repeat(17000))).status, 413);
  for (let n = 0; n < 7; n++) await send("{}");
  assert.equal((await send("{}", { "x-forwarded-for": "different-ip" })).status, 429);
});

test("automatic registration requires upstream acceptance but no shared secret", async () => {
  const f = fixture({ mode: "auto", secret: undefined });
  const result = await f.register({}, body);
  assert.deepEqual(result, {
    status: 200,
    body: { registered: true, worker_id: id, status: "active" },
  });
  assert.deepEqual(f.calls, ["validate", [key, origin, "active"]]);
});
for (const state of ["invalid", "unavailable"]) {
  test(`automatic registration does not save a key after upstream ${state}`, async () => {
    const f = fixture({ mode: "auto", secret: undefined, validateKey: async () => state });
    assert.equal((await f.register({}, body)).status, state === "invalid" ? 400 : 503);
    assert.deepEqual(f.calls, []);
  });
}
test("automatic repeated registration returns one identifier and limits origin attempts", async () => {
  const f = fixture({ mode: "auto", secret: undefined });
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.equal((await f.register({}, body)).body.worker_id, id);
  }
  assert.equal((await f.register({}, body)).status, 429);
  assert.equal(f.calls.filter((c) => c === "validate").length, 3);
});
test("automatic registration handles database failures without exposing keys", async () => {
  const f = fixture({
    mode: "auto",
    secret: undefined,
    store: {
      async register() {
        throw new Error(key);
      },
    },
  });
  assert.deepEqual(await f.register({}, body), {
    status: 503,
    body: { error: "registration_unavailable" },
  });
});

test("HTTP automatic mode registers without signature and never echoes the key", async (t) => {
  const f = fixture({ mode: undefined, secret: undefined });
  const server = createGatorServer(readConfig({}), f.register);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/public/v1/workers/register`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  assert.equal(response.status, 200);
  const payload = await response.text();
  assert.equal(payload.includes(key), false);
  assert.deepEqual(JSON.parse(payload), { registered: true, worker_id: id, status: "active" });
  assert.deepEqual(f.calls, ["validate", [key, origin, "active"]]);
});
