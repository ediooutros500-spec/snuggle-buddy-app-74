const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs");
function resources({ authorized = true, role = "admin", tables = {}, missing = false } = {}) {
  const calls = [],
    events = [];
  const pool = {
    from(table) {
      const entry = { table, select: "", filters: [], patch: null };
      calls.push(entry);
      const data = tables[table] || [];
      const result = () => ({ data, error: null, count: data.length });
      const q = {
        select(fields) {
          entry.select = fields;
          return q;
        },
        eq(k, v) {
          entry.filters.push(["eq", k, v]);
          return q;
        },
        gte(k, v) {
          entry.filters.push(["gte", k, v]);
          return q;
        },
        lt(k, v) {
          entry.filters.push(["lt", k, v]);
          return q;
        },
        ilike(k, v) {
          entry.filters.push(["ilike", k, v]);
          return q;
        },
        order() {
          return q;
        },
        range(a, b) {
          entry.range = [a, b];
          return Promise.resolve(result());
        },
        single: async () => ({ data: data[0] || null, error: null }),
        maybeSingle: async () => ({ data: missing ? null : { id: "credential-1" }, error: null }),
        update(p) {
          entry.patch = p;
          return q;
        },
        then(resolve, reject) {
          return Promise.resolve(result()).then(resolve, reject);
        },
      };
      return q;
    },
    rpc: async () => assert.fail("Unexpected credential persistence"),
  };
  const module = load("src/lib/admin-resources.server.ts", {
    "./admin-auth.server": {
      authorizeAdmin: async (req, permission) =>
        authorized && !(role === "viewer" && permission === "write")
          ? { ok: true, actorId: "owner" }
          : { ok: false, status: authorized ? 403 : 401 },
      adminJson: (body, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        }),
    },
    "./key-pool.server": {
      getPoolAdmin: () => {
        if (!authorized) assert.fail("Anonymous request reached database");
        return pool;
      },
    },
    "./admin-store.server": { recordAdminAudit: async (...args) => events.push(args) },
  });
  return {
    ...module,
    calls,
    events,
    send: (resource, method = "GET", body, query = "") =>
      module.handleAdminResource(
        new Request("https://panel.example.test/api/admin/" + resource + query, {
          method,
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
        resource,
      ),
  };
}
test("all new resources deny anonymous access before querying the database", async () => {
  const f = resources({ authorized: false });
  for (const resource of ["system", "clients", "credentials", "requests", "usage"])
    assert.equal((await f.send(resource)).status, 401);
});
test("read-only account cannot change provider credentials", async () => {
  const f = resources({ role: "viewer" });
  assert.equal((await f.send("credentials", "PATCH", { id: "x", status: "disabled" })).status, 403);
  assert.equal(f.calls.length, 0);
});
test("client list is paginated and never returns stored key records", async () => {
  const f = resources({
    tables: {
      gateway_clients: [
        { id: "client", name: "Test", client_key: "gw_hash_v1:gw_test:1234:" + "a".repeat(64) },
      ],
    },
  });
  const r = await f.send("clients", "GET", null, "?page=2&q=Test");
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(d.rows[0].client_key, undefined);
  assert.equal(JSON.stringify(d).includes("gw_hash_v1"), false);
  assert.deepEqual(f.calls[0].range, [25, 49]);
  assert.ok(f.calls[0].filters.some((x) => x[0] === "ilike"));
});
test("credential query selects metadata only and missing updates return 404", async () => {
  const f = resources({ missing: true });
  assert.equal((await f.send("credentials")).status, 200);
  assert.equal(f.calls[0].select.includes("api_key_enc"), false);
  assert.equal(f.calls[0].select.includes("api_key_hash"), false);
  assert.equal((await f.send("credentials", "PATCH", { id: "x", status: "disabled" })).status, 404);
  assert.equal(f.events.length, 0);
});
test("credential quota and state changes are validated and audited", async () => {
  const f = resources();
  assert.equal(
    (await f.send("credentials", "PATCH", { id: "x", daily_request_limit: -1 })).status,
    400,
  );
  assert.equal(
    (
      await f.send("credentials", "PATCH", {
        id: "x",
        daily_request_limit: 0,
        account_label: "My account",
        status: "disabled",
      })
    ).status,
    200,
  );
  assert.equal(f.events.length, 1);
  assert.deepEqual(f.calls[0].patch, {
    status: "disabled",
    daily_request_limit: 0,
    account_label: "My account",
  });
});
test("usage distinguishes unknown tokens from measured zero and never invents cost", () => {
  const f = resources();
  const d = f.summarizeUsage([
    {
      client_name: "A",
      resolved_model: "M",
      status_code: 200,
      created_at: "2026-10-22",
      input_tokens: 10,
      output_tokens: 20,
      latency_ms: 100,
    },
    {
      client_name: "A",
      resolved_model: "M",
      status_code: 429,
      created_at: "2026-10-22",
      input_tokens: null,
      output_tokens: null,
      latency_ms: 20,
    },
  ]);
  assert.equal(d.requests, 2);
  assert.equal(d.errors, 1);
  assert.equal(d.inputTokens, 10);
  assert.equal(d.outputTokens, 20);
  assert.equal(d.unknownUsage, 1);
  assert.equal(d.costUsd, null);
  assert.equal(d.byClient[0].requests, 2);
});
test("request filters and CSV export use safe metadata and escape spreadsheet formulas", async () => {
  const f = resources({
    tables: {
      gateway_request_logs: [
        {
          created_at: "2026-10-22",
          client_name: "=SHEET()",
          status_code: 429,
          endpoint: "/v1/messages",
          request_id: "request",
        },
      ],
    },
  });
  const r = await f.send(
    "requests",
    "GET",
    null,
    "?days=30&status=error&resolved_model=model&export=csv",
  );
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/csv/);
  assert.ok((await r.text()).includes("'=SHEET()"));
  assert.ok(f.calls[0].filters.some((x) => x[1] === "status_code" && x[2] === 400));
  assert.deepEqual(f.calls[0].range, [0, 999]);
});
for (const status of [401, 403, 500])
  test(`manual credential registration never persists an upstream HTTP ${status}`, async (t) => {
    const old = global.fetch;
    global.fetch = async () => new Response("{}", { status });
    t.after(() => {
      global.fetch = old;
    });
    const f = resources();
    const r = await f.send("credentials", "POST", {
      api_key: "test-only-placeholder",
      project_origin: "https://audit.lovable.app",
    });
    assert.equal(r.status, status >= 500 ? 503 : 400);
    assert.equal(f.events.length, 0);
  });
test("telemetry records rejected authenticated calls once with unknown usage and no credentials", async () => {
  const records = [];
  const { withRequestTelemetry } = load("src/lib/request-telemetry.server.ts", {
    "./key-pool.server": {
      getPoolAdmin: () => ({
        from: (table) => {
          assert.equal(table, "gateway_request_logs");
          return {
            insert: async (row) => {
              records.push(row);
              return { error: null };
            },
          };
        },
      }),
    },
  });
  const r = await withRequestTelemetry(
    new Request("https://api.example.test", {
      headers: { authorization: "Bearer private-client-key" },
    }),
    "/v1/messages",
    async (trace) => {
      trace.auth = { authorized: true, isAdmin: false, client: { id: "client", name: "User" } };
      return new Response("{}", { status: 429 });
    },
  );
  assert.equal(r.status, 429);
  assert.ok(r.headers.get("x-request-id"));
  assert.equal(records.length, 1);
  assert.equal(records[0].input_tokens, null);
  assert.equal(records[0].status_code, 429);
  assert.equal(JSON.stringify(records).includes("private-client-key"), false);
});
test("media pass-through telemetry waits for end without buffering the provider body", async () => {
  const rows = [];
  const { withRequestTelemetry } = load("src/lib/request-telemetry.server.ts", {
    "./key-pool.server": {
      getPoolAdmin: () => ({
        from: () => ({
          insert: async (row) => {
            rows.push(row);
            return { error: null };
          },
        }),
      }),
    },
  });
  const r = await withRequestTelemetry(
    new Request("https://api.example.test"),
    "/v1/images/generations",
    async (trace) => {
      trace.auth = { authorized: true, isAdmin: false };
      trace.passThrough = true;
      return new Response("opaque-provider-response");
    },
  );
  assert.equal(rows.length, 0);
  assert.equal(await r.text(), "opaque-provider-response");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].output_tokens, null);
});
test("stream completion writes measured usage after provider completion", async () => {
  const { openaiStream } = load("src/lib/openai-compat.server.ts", {
    "./key-pool.server": { getPoolAdmin: () => null },
  });
  let finished = null;
  const payload =
    "data: " +
    JSON.stringify({
      choices: [{ delta: { content: "hello" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 4, completion_tokens: 2 },
    }) +
    "\n\ndata: [DONE]\n\n";
  const response = openaiStream("google/test", new Response(payload), false, async (acc) => {
    finished = acc;
  });
  assert.ok((await response.text()).includes("hello"));
  assert.equal(finished.usageKnown, true);
  assert.equal(finished.usage.input_tokens, 4);
});
test("password endpoint updates the signed-in user only and rejects an incorrect current password", async () => {
  let target;
  const { Route } = load("src/routes/api/admin/password.ts", {
    "@tanstack/react-router": { createFileRoute: () => (c) => c },
    "@/lib/admin-auth.server": {
      sameAdminOrigin: () => true,
      adminIdentity: async () => ({ id: "self", username: "operator" }),
      adminJson: (d, status = 200) => new Response(JSON.stringify(d), { status }),
    },
    "@/lib/admin-store.server": {
      findAdminUser: async () => ({ passwordHash: "hash" }),
      verifyAdminPassword: async (password) => password === "correct",
      updateAdminUser: async (actor, id) => {
        target = [actor, id];
      },
    },
  });
  const send = (password) =>
    Route.server.handlers.POST({
      request: new Request("https://panel.example.test/api/admin/password", {
        method: "POST",
        body: JSON.stringify({
          id: "other-user",
          currentPassword: password,
          newPassword: "new-password-long-enough",
        }),
      }),
    });
  assert.equal((await send("wrong")).status, 400);
  assert.equal(target, undefined);
  assert.equal((await send("correct")).status, 200);
  assert.deepEqual(target, ["self", "self"]);
});
