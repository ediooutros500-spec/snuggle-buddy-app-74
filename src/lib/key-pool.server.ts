import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { safeEqual } from "./claude-compat.server";

export const PARENT_ORIGIN = "https://snuggle-buddy-app-74.lovable.app";
export const REMIX_SYNC_SECRET = process.env["REMIX_SYNC_SECRET"]?.trim() ?? "";
const EXHAUSTED_COOLDOWN_MS = 15 * 60 * 1000;

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) headers.delete("Authorization");
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

let _poolClient: SupabaseClient | null = null;
export function getPoolAdmin(): SupabaseClient | null {
  if (_poolClient) return _poolClient;
  const url = process.env["POOL_SUPABASE_URL"] ?? "https://qtsyuyuuzshnurdatzla.supabase.co";
  const key = process.env["POOL_SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  _poolClient = createClient(url, key, { global: { fetch: createSupabaseFetch(key) }, auth: { storage: undefined, persistSession: false, autoRefreshToken: false } });
  return _poolClient;
}

export function verifySyncToken(request: Request): boolean {
  const token = request.headers.get("x-remix-sync-token")?.trim() ?? "";
  return Boolean(token && REMIX_SYNC_SECRET && safeEqual(token, REMIX_SYNC_SECRET));
}

export async function getNextApiKey(excludeKeys?: Set<string>): Promise<string | null> {
  const pool = getPoolAdmin();
  if (!pool) return process.env["LOVABLE_API_KEY"]?.trim() ?? null;
  try {
    // The v2 RPC is the only read path. It decrypts inside Postgres and applies cooldown and quota.
    const attempts = Math.max(1, Math.min(excludeKeys?.size ? excludeKeys.size + 1 : 1, 8));
    for (let i = 0; i < attempts; i++) {
      const { data, error } = await pool.rpc("get_next_api_key");
      if (error || typeof data !== "string" || !data.trim()) break;
      const key = data.trim();
      if (!excludeKeys?.has(key)) return key;
    }
  } catch (err) {
    console.error("[key-pool] falha ao selecionar chave via RPC", err);
  }
  const fallback = process.env["LOVABLE_API_KEY"]?.trim() ?? null;
  if (fallback && excludeKeys?.has(fallback)) return null;
  if (fallback) console.warn("[key-pool] fallback: usando LOVABLE_API_KEY do pai");
  return fallback;
}

export async function markKeyStatus(apiKey: string, status: "exhausted" | "disabled", lastError: string): Promise<void> {
  const pool = getPoolAdmin();
  if (!pool || !apiKey) return;
  try {
    await pool.rpc("mark_key_status", { p_api_key: apiKey, p_status: status, p_error: lastError.slice(0, 500) });
  } catch (err) {
    console.error("[key-pool] falha ao marcar status via RPC", err);
  }
}

export async function fetchGatewayWithFailover(url: string, payload: unknown, maxAttempts = 4): Promise<{ upstream: Response | null; networkError: boolean }> {
  let lastUpstream: Response | null = null;
  let sawNetworkError = false;
  const triedKeys = new Set<string>();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const apiKey = await getNextApiKey(triedKeys);
    if (!apiKey) break;
    triedKeys.add(apiKey);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" }, body: JSON.stringify(payload) });
      lastUpstream = res;
      sawNetworkError = false;
      if (res.status === 429 || res.status === 402) {
        await markKeyStatus(apiKey, "exhausted", `HTTP ${res.status}: rate limit ou créditos esgotados (cooldown 15m)`);
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        await markKeyStatus(apiKey, "disabled", `HTTP ${res.status}: chave rejeitada pelo gateway`);
        continue;
      }
      if (res.status >= 500 && attempt < maxAttempts) continue;
      return { upstream: res, networkError: false };
    } catch {
      sawNetworkError = true;
    }
  }
  return { upstream: lastUpstream, networkError: !lastUpstream && sawNetworkError };
}

let lastHandshakeAt = 0;
const HANDSHAKE_TTL_MS = 10 * 60 * 1000;
let warnedMissingSyncSecret = false;
export async function maybeAutoRegisterChild(requestUrl: string): Promise<void> {
  const now = Date.now();
  if (now - lastHandshakeAt < HANDSHAKE_TTL_MS) return;
  let currentOrigin = "";
  try { currentOrigin = new URL(requestUrl).origin.replace(/\/+$/, ""); } catch { return; }
  if (!currentOrigin || currentOrigin === PARENT_ORIGIN || currentOrigin.includes("localhost") || currentOrigin.includes("127.0.0.1")) { lastHandshakeAt = now; return; }
  const apiKey = process.env["LOVABLE_API_KEY"]?.trim();
  if (!apiKey || !REMIX_SYNC_SECRET) {
    if (!REMIX_SYNC_SECRET && !warnedMissingSyncSecret) { console.warn("[key-pool] REMIX_SYNC_SECRET ausente; auto-registro do filho desativado"); warnedMissingSyncSecret = true; }
    return;
  }
  lastHandshakeAt = now;
  try {
    const response = await fetch(`${PARENT_ORIGIN}/api/public/v1/workers/register`, { method: "POST", headers: { "Content-Type": "application/json", "x-remix-sync-token": REMIX_SYNC_SECRET }, body: JSON.stringify({ api_key: apiKey, project_origin: currentOrigin }) });
    if (!response.ok) lastHandshakeAt = 0;
  } catch { lastHandshakeAt = 0; }
}
