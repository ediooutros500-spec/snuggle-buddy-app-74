import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { safeEqual } from "./claude-compat.server";
import { PARENT_ORIGIN, getChildConfig } from "./child-config.server";
import { triggerChildHandshake } from "./child-handshake.server";

export { PARENT_ORIGIN };
export const REMIX_SYNC_SECRET = getChildConfig().remixSyncSecret;

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

let _poolClient: SupabaseClient | null = null;
export function getPoolAdmin(): SupabaseClient | null {
  if (_poolClient) return _poolClient;
  const url =
    process.env["GATOR_SUPABASE_URL"] ??
    process.env["POOL_SUPABASE_URL"] ??
    process.env["SUPABASE_URL"] ??
    "https://qtsyuyuuzshnurdatzla.supabase.co";
  const key =
    process.env["GATOR_SUPABASE_SERVICE_ROLE_KEY"] ??
    process.env["POOL_SUPABASE_SERVICE_ROLE_KEY"] ??
    process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  _poolClient = createClient(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  return _poolClient;
}

export function verifySyncToken(request: Request): boolean {
  const token = request.headers.get("x-remix-sync-token")?.trim() ?? "";
  const secret = process.env["REMIX_SYNC_SECRET"]?.trim() ?? "";
  return Boolean(token && secret && safeEqual(token, secret));
}

export function makeKeyHint(apiKey: string): string {
  const k = apiKey.trim();
  if (k.length < 8) return "****";
  return `${k.slice(0, 4)}...${k.slice(-4)}`;
}

export async function getNextApiKey(excludeKeys?: Set<string>): Promise<string | null> {
  const pool = getPoolAdmin();
  if (!pool) return process.env["LOVABLE_API_KEY"]?.trim() ?? null;
  try {
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

export async function markKeyStatus(
  apiKey: string,
  status: "exhausted" | "disabled",
  lastError: string,
): Promise<void> {
  const pool = getPoolAdmin();
  if (!pool || !apiKey) return;
  try {
    await pool.rpc("mark_key_status", {
      p_api_key: apiKey,
      p_status: status,
      p_error: lastError.slice(0, 500),
    });
  } catch (err) {
    console.error("[key-pool] falha ao marcar status via RPC", err);
  }
}

export async function fetchGatewayWithFailover(
  url: string,
  payload: unknown,
  maxAttempts = 4,
): Promise<{
  upstream: Response | null;
  networkError: boolean;
  workerKeyHint?: string | undefined;
  attemptsCount: number;
}> {
  let lastUpstream: Response | null = null;
  let sawNetworkError = false;
  let lastKeyHint: string | undefined;
  const triedKeys = new Set<string>();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const apiKey = await getNextApiKey(triedKeys);
    if (!apiKey) break;
    triedKeys.add(apiKey);
    lastKeyHint = makeKeyHint(apiKey);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify(payload),
      });
      lastUpstream = res;
      sawNetworkError = false;

      if (res.status === 429 || res.status === 402) {
        await markKeyStatus(
          apiKey,
          "exhausted",
          `HTTP ${res.status}: rate limit ou créditos esgotados (cooldown 15m)`,
        );
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        await markKeyStatus(apiKey, "disabled", `HTTP ${res.status}: chave rejeitada pelo gateway`);
        continue;
      }
      if (res.status >= 500 && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 150 * attempt + Math.floor(Math.random() * 100)));
        continue;
      }
      return {
        upstream: res,
        networkError: false,
        workerKeyHint: lastKeyHint,
        attemptsCount: attempt,
      };
    } catch {
      sawNetworkError = true;
    }
  }
  return {
    upstream: lastUpstream,
    networkError: !lastUpstream && sawNetworkError,
    workerKeyHint: lastKeyHint,
    attemptsCount: triedKeys.size,
  };
}

export async function maybeAutoRegisterChild(requestUrl: string): Promise<void> {
  await triggerChildHandshake(requestUrl, false);
}
