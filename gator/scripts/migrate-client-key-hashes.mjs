import { createHash } from "node:crypto";

// Compatibility migration: keeps existing client API keys working, removes plaintext storage.
// Run only after deploying authentication that understands gw_hash_v1 records.
const base = process.env.GATOR_SUPABASE_URL;
const key = process.env.GATOR_SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: key,
  "content-type": "application/json",
  prefer: "return=representation",
};
if (key && !key.startsWith("sb_secret_")) headers.authorization = `Bearer ${key}`;
const encode = (value) =>
  `gw_hash_v1:${value.slice(0, 7)}:${value.slice(-4)}:${createHash("sha256").update(value).digest("hex")}`;
async function request(path, init = {}) {
  const response = await fetch(new URL(`/rest/v1/${path}`, base), {
    ...init,
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("migration_database_error");
  return response.json();
}
async function main() {
  if (!base || !key) throw new Error("migration_configuration_missing");
  const rows = await request("gateway_clients?select=id,client_key&order=id&limit=1000");
  if (!Array.isArray(rows) || rows.length >= 1000)
    throw new Error("migration_requires_pagination_review");
  let converted = 0;
  const pending = rows.filter((row) => !row.client_key.startsWith("gw_hash_v1:"));
  if (process.argv.includes("--apply")) {
    for (const row of pending) {
      const query = new URLSearchParams({ id: `eq.${row.id}`, client_key: `eq.${row.client_key}` });
      const updated = await request(`gateway_clients?${query}`, {
        method: "PATCH",
        body: JSON.stringify({ client_key: encode(row.client_key) }),
      });
      if (updated.length !== 1) throw new Error("migration_conflicting_update");
      converted++;
    }
    const checked = await request("gateway_clients?select=client_key&limit=1000");
    if (checked.some((row) => !row.client_key.startsWith("gw_hash_v1:")))
      throw new Error("migration_incomplete");
  }
  console.log(
    JSON.stringify({
      total: rows.length,
      pending: pending.length,
      converted,
      applied: process.argv.includes("--apply"),
      secretsPrinted: false,
    }),
  );
}
main().catch(() => {
  console.error(
    "Client key migration failed; no credentials logged. Check database access and concurrent changes.",
  );
  process.exitCode = 1;
});
