const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-typescript.cjs");
test("administrative playground enforces write access, selected client identity and fixed upstream", async (t) => {
  const previous = global.fetch,
    base = process.env.API_PUBLIC_URL;
  process.env.API_PUBLIC_URL = "https://api.gateway.test";
  t.after(() => {
    global.fetch = previous;
    if (base === undefined) delete process.env.API_PUBLIC_URL;
    else process.env.API_PUBLIC_URL = base;
  });
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ choices: [{ message: { content: "OK" } }] });
  };
  let writable = false,
    client = "chosen";
  const { Route } = load("src/routes/api/admin/playground.ts", {
    "@tanstack/react-router": { createFileRoute: () => (x) => x },
    "@/lib/admin-auth.server": {
      authorizeAdmin: async (_, permission) => {
        assert.equal(permission, "write");
        return { ok: writable, status: 403 };
      },
      adminJson: (body, status = 200) => Response.json(body, { status }),
    },
    "@/lib/claude-compat.server": {
      authenticateGatewayRequest: async (request, observe) => {
        assert.equal(observe, false);
        assert.equal(request.headers.get("authorization"), "Bearer temporary-test-key");
        return { authorized: true, client: { id: client } };
      },
    },
    "@/lib/gateway-policy.server": { MODEL_CATALOG: [{ id: "openai/gpt-6.1-sol", kind: "text" }] },
  });
  const body = {
    api_key: "temporary-test-key",
    client_id: "chosen",
    model: "openai/gpt-6.1-sol",
    prompt: "reply OK",
    device_id: "test-device-01",
  };
  const send = (b) =>
    Route.server.handlers.POST({
      request: new Request("https://panel.test/api/admin/playground", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    });
  assert.equal((await send(body)).status, 403);
  assert.equal(calls.length, 0);
  writable = true;
  client = "other";
  assert.equal((await send(body)).status, 403);
  assert.equal(calls.length, 0);
  client = "chosen";
  assert.equal((await send({ ...body, model: "https://evil.test" })).status, 400);
  assert.equal(calls.length, 0);
  const result = await (await send(body)).json();
  assert.equal(result.status, 200);
  assert.equal(calls[0].url, "https://api.gateway.test/v1/chat/completions");
  assert.equal(calls[0].init.headers.get("x-device-id"), "test-device-01");
  assert.equal(calls[0].init.headers.get("cookie"), null);
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(JSON.stringify(result).includes(body.api_key), false);
});
