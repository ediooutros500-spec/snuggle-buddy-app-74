import { createHash, randomUUID } from "node:crypto";

// Prints only check names and booleans. Never print API responses or credentials.
const base = process.env.GATOR_SUPABASE_URL;
const serviceKey = process.env.GATOR_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.GATOR_SUPABASE_ANON_KEY;
const checks = [];
function check(name, passed) {
  checks.push({ check: name, passed: Boolean(passed) });
}
function headers(key) {
  return {
    apikey: key,
    "content-type": "application/json",
    ...(!key.startsWith("sb_") ? { authorization: `Bearer ${key}` } : {}),
  };
}
async function api(path, { method = "GET", body, key = serviceKey } = {}) {
  const response = await fetch(new URL(`/rest/v1/${path}`, base), {
    method,
    headers: headers(key),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
}

async function main() {
  if (!base || !serviceKey) throw new Error("configuration_missing");
  const spec = await api("");
  if (!spec.ok) throw new Error("database_unavailable");
  const tables = [
    "gateway_clients",
    "gateway_client_keys",
    "gateway_key_pool",
    "gateway_workers",
    "gateway_handshake_nonces",
    "gateway_settings",
    "gateway_request_logs",
    "gateway_usage_daily",
    "gateway_jobs",
    "gateway_audit_logs",
  ];
  for (const table of tables) {
    const result = await api(`${table}?select=*&limit=0`);
    check(`table:${table}`, result.ok);
  }
  for (const name of [
    "register_worker_key",
    "get_next_api_key",
    "mark_key_status",
    "consume_client_quota",
    "log_request_and_increment_usage",
  ]) {
    check(`rpc_exists:${name}`, Boolean(spec.data.paths?.[`/rpc/${name}`]));
  }
  const vault = await api("rpc/pool_enc_key");
  check("vault_configured", vault.ok && typeof vault.data === "string" && vault.data.length > 0);
  if (anonKey) {
    const anonymous = await api("rpc/pool_enc_key", { key: anonKey });
    check("vault_denies_anonymous", [401, 403, 404].includes(anonymous.status));
    const settings = await api("gateway_settings?select=id&limit=1", { key: anonKey });
    check(
      "settings_hidden_from_anonymous",
      [401, 403].includes(settings.status) ||
        (settings.ok && Array.isArray(settings.data) && settings.data.length === 0),
    );
  }
  const quota = await api("rpc/consume_client_quota", {
    method: "POST",
    body: { p_client_id: randomUUID(), p_model: null, p_endpoint: null },
  });
  check("quota_rejects_unknown_client", quota.ok && quota.data?.allowed === false);

  if (process.argv.includes("--self-test")) await selfTest();
}

async function selfTest() {
  const testId = randomUUID();
  const origin = `https://gator-selftest-${testId}.lovable.app`;
  const key = `gator-disabled-selftest-${randomUUID()}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const nonce = `selftest-${randomUUID()}`;
  // Test key is always DISABLED: it cannot be selected for real upstream requests.
  const payload = { p_api_key: key, p_origin: origin, p_status: "disabled", p_error: null };
  let poolId;
  try {
    const first = await api("rpc/register_worker_key", { method: "POST", body: payload });
    check("registration_rpc_executes", first.ok && typeof first.data === "string");
    if (!first.ok || typeof first.data !== "string") return;
    poolId = first.data;
    const second = await api("rpc/register_worker_key", { method: "POST", body: payload });
    check("registration_rpc_idempotent", second.ok && second.data === poolId);
    const saved = await api(
      `gateway_key_pool?id=eq.${poolId}&select=api_key_hash,api_key_enc,status`,
    );
    const row = saved.data?.[0];
    check("worker_hash_matches", saved.ok && row?.api_key_hash === hash);
    check("worker_disabled", row?.status === "disabled");
    check(
      "worker_cipher_stored",
      typeof row?.api_key_enc === "string" &&
        row.api_key_enc.length > 0 &&
        !row.api_key_enc.includes(key),
    );
    const worker = await api(`gateway_workers?key_pool_id=eq.${poolId}&select=id,handshake_count`);
    check(
      "worker_upsert_idempotent",
      worker.ok && worker.data?.length === 1 && Number(worker.data[0].handshake_count) >= 2,
    );
    const one = await api("gateway_handshake_nonces", { method: "POST", body: { nonce, origin } });
    const two = await api("gateway_handshake_nonces", { method: "POST", body: { nonce, origin } });
    check("nonce_unique_constraint", one.ok && two.status === 409 && two.data?.code === "23505");
  } finally {
    // Exact generated identifiers only. Never delete existing workers, keys, or nonces.
    const nonceCleanup = await api(`gateway_handshake_nonces?nonce=eq.${nonce}`, {
      method: "DELETE",
    });
    const workerCleanup = await api(`gateway_workers?origin=eq.${encodeURIComponent(origin)}`, {
      method: "DELETE",
    });
    const poolCleanup = await api(`gateway_key_pool?api_key_hash=eq.${hash}`, { method: "DELETE" });
    check("selftest_cleanup", nonceCleanup.ok && workerCleanup.ok && poolCleanup.ok);
  }
}

try {
  await main();
} catch {
  check("audit_completed", false);
} finally {
  console.log(JSON.stringify({ checks, sqlRlsAudit: "pending_project_sql_access" }, null, 2));
  if (checks.some((result) => !result.passed)) process.exitCode = 1;
}
