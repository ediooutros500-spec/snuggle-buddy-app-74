/**
 * Gerenciador do Pool de Chaves (Load Balancer Round-Robin + Failover 429)
 * conectado exclusivamente ao 2º Supabase (`qtsyuyuuzshnurdatzla`), mantendo o
 * Supabase original da Lovable Cloud intacto.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { safeEqual } from "./claude-compat.server";

export const PARENT_ORIGIN = "https://snuggle-buddy-app-74.lovable.app";
export const REMIX_SYNC_SECRET =
  process.env["REMIX_SYNC_SECRET"] ?? "snuggle-pool-sync-v1";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    }
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

/**
 * Cliente isolado do 2º Supabase (apenas para a tabela `public.gateway_key_pool`).
 * Lê `POOL_SUPABASE_URL` (default: projeto qtsyuyuuzshnurdatzla) e
 * `POOL_SUPABASE_SERVICE_ROLE_KEY`.
 */
export function getPoolAdmin(): SupabaseClient | null {
  if (_poolClient) return _poolClient;
  const url =
    process.env["POOL_SUPABASE_URL"] ??
    "https://qtsyuyuuzshnurdatzla.supabase.co";
  const key = process.env["POOL_SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;

  _poolClient = createClient(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return _poolClient;
}

export function verifySyncToken(request: Request): boolean {
  const token = request.headers.get("x-remix-sync-token")?.trim() ?? "";
  if (!token || !REMIX_SYNC_SECRET) return false;
  return safeEqual(token, REMIX_SYNC_SECRET);
}

/**
 * Seleção da chave (Round-Robin ponderado por uso):
 * 1. Usa a função atômica `get_next_api_key()` no 2º Supabase (`last_used_at ASC NULLS FIRST` + `FOR UPDATE SKIP LOCKED`).
 * 2. Caso a tabela esteja vazia ou o pool não esteja configurado, usa `process.env.LOVABLE_API_KEY` do Pai como fallback.
 */
export async function getNextApiKey(): Promise<string | null> {
  const pool = getPoolAdmin();
  if (pool) {
    try {
      const { data: rpcKey, error: rpcErr } = await pool.rpc("get_next_api_key");
      if (!rpcErr && typeof rpcKey === "string" && rpcKey.trim().length > 0) {
        return rpcKey.trim();
      }

      // Fallback em duas etapas caso a RPC não esteja disponível
      const { data: rows } = await pool
        .from("gateway_key_pool")
        .select("id, api_key, total_requests")
        .eq("status", "active")
        .order("last_used_at", { ascending: true, nullsFirst: true })
        .limit(1);

      const picked = rows?.[0];
      if (picked?.api_key) {
        await pool
          .from("gateway_key_pool")
          .update({
            last_used_at: new Date().toISOString(),
            total_requests: Number(picked.total_requests ?? 0) + 1,
          })
          .eq("id", picked.id);
        return String(picked.api_key);
      }
    } catch (err) {
      console.error("[key-pool] falha ao buscar chave no pool", err);
    }
  }

  return process.env["LOVABLE_API_KEY"] ?? null;
}

export async function markKeyExhausted(
  apiKey: string,
  lastError = "HTTP 429: Quota exceeded / Rate limited",
): Promise<void> {
  const pool = getPoolAdmin();
  if (!pool || !apiKey) return;
  try {
    await pool
      .from("gateway_key_pool")
      .update({
        status: "exhausted",
        exhausted_at: new Date().toISOString(),
        last_error: lastError,
      })
      .eq("api_key", apiKey);
  } catch (err) {
    console.error("[key-pool] falha ao marcar chave como exhausted", err);
  }
}

/**
 * Faz a requisição ao `ai.gateway.lovable.dev` usando o pool de chaves
 * com Failover Automático em caso de 429 (até 3 tentativas transparentes).
 */
export async function fetchGatewayWithFailover(
  url: string,
  payload: unknown,
  maxAttempts = 3,
): Promise<{ upstream: Response | null; networkError: boolean }> {
  let lastUpstream: Response | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const apiKey = await getNextApiKey();
    if (!apiKey) {
      return { upstream: null, networkError: false };
    }

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

      if (res.status === 429) {
        await markKeyExhausted(apiKey, "HTTP 429: Quota exceeded / Rate limited");
        continue;
      }

      return { upstream: res, networkError: false };
    } catch {
      return { upstream: null, networkError: true };
    }
  }

  return { upstream: lastUpstream, networkError: false };
}

/* ─────────────── Passo 3: Auto-registro quando rodar como Filho ─────────── */

let childHandshakeSent = false;

export async function maybeAutoRegisterChild(requestUrl: string): Promise<void> {
  if (childHandshakeSent) return;
  let currentOrigin = "";
  try {
    currentOrigin = new URL(requestUrl).origin.replace(/\/+$/, "");
  } catch {
    return;
  }

  if (
    !currentOrigin ||
    currentOrigin === PARENT_ORIGIN ||
    currentOrigin.includes("localhost") ||
    currentOrigin.includes("127.0.0.1")
  ) {
    childHandshakeSent = true;
    return;
  }

  const apiKey = process.env["LOVABLE_API_KEY"]?.trim();
  if (!apiKey) return;

  childHandshakeSent = true;
  try {
    await fetch(`${PARENT_ORIGIN}/api/public/v1/workers/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-remix-sync-token": REMIX_SYNC_SECRET,
      },
      body: JSON.stringify({
        api_key: apiKey,
        project_origin: currentOrigin,
      }),
    });
  } catch {
    childHandshakeSent = false;
  }
}
