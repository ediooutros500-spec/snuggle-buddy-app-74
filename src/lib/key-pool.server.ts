/**
 * Gerenciador do Pool de Chaves (Load Balancer Round-Robin + Failover Inteligente)
 * conectado exclusivamente ao 2º Supabase (`qtsyuyuuzshnurdatzla`), mantendo o
 * Supabase original da Lovable Cloud intacto.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { safeEqual } from "./claude-compat.server";

export const PARENT_ORIGIN = "https://snuggle-buddy-app-74.lovable.app";
export const REMIX_SYNC_SECRET =
  process.env["REMIX_SYNC_SECRET"] ?? "snuggle-pool-sync-v1";

/** Cooldown automático para chaves marcadas como exhausted (15 min) */
const EXHAUSTED_COOLDOWN_MS = 15 * 60 * 1000;

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
 * Reativa chaves `exhausted` cujo tempo de repouso (15 min) já expirou.
 */
export async function reviveCooledDownKeys(): Promise<void> {
  const pool = getPoolAdmin();
  if (!pool) return;
  try {
    const cutoff = new Date(Date.now() - EXHAUSTED_COOLDOWN_MS).toISOString();
    await pool
      .from("gateway_key_pool")
      .update({ status: "active", exhausted_at: null })
      .eq("status", "exhausted")
      .lt("exhausted_at", cutoff);
  } catch {
    // silencioso
  }
}

/**
 * Seleção da chave (Round-Robin ponderado por uso):
 * 1. Usa a função atômica `get_next_api_key()` no 2º Supabase (`last_used_at ASC NULLS FIRST` + `FOR UPDATE SKIP LOCKED` + auto-cooldown).
 * 2. Fallback em query se necessário e por fim `process.env.LOVABLE_API_KEY` do Pai.
 */
export async function getNextApiKey(excludeKeys?: Set<string>): Promise<string | null> {
  const pool = getPoolAdmin();
  if (pool) {
    try {
      if (!excludeKeys || excludeKeys.size === 0) {
        const { data: rpcKey, error: rpcErr } = await pool.rpc("get_next_api_key");
        if (!rpcErr && typeof rpcKey === "string" && rpcKey.trim().length > 0) {
          return rpcKey.trim();
        }
      }

      await reviveCooledDownKeys();

      const { data: rows } = await pool
        .from("gateway_key_pool")
        .select("id, api_key, total_requests")
        .eq("status", "active")
        .order("last_used_at", { ascending: true, nullsFirst: true })
        .limit(10);

      const picked = (rows ?? []).find(
        (r) => r.api_key && (!excludeKeys || !excludeKeys.has(String(r.api_key))),
      );

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

  const fallback = process.env["LOVABLE_API_KEY"]?.trim() ?? null;
  if (fallback && excludeKeys?.has(fallback)) return null;
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
    await pool
      .from("gateway_key_pool")
      .update({
        status,
        exhausted_at: new Date().toISOString(),
        last_error: lastError.slice(0, 500),
      })
      .eq("api_key", apiKey);
  } catch (err) {
    console.error("[key-pool] falha ao atualizar status da chave", err);
  }
}

/**
 * Dispara a requisição para o `ai.gateway.lovable.dev` com Failover Automático:
 * - 429 (Rate limit / Quota) ou 402 (Créditos esgotados): marca a chave como `exhausted` e tenta a próxima imediatamente.
 * - 401 / 403 (Chave inválida/revogada): marca a chave como `disabled` e tenta a próxima imediatamente.
 * - 500 / 502 / 503 / 504 ou erro de rede/timeout: tenta a próxima chave sem queimar a atual.
 */
export async function fetchGatewayWithFailover(
  url: string,
  payload: unknown,
  maxAttempts = 4,
): Promise<{ upstream: Response | null; networkError: boolean }> {
  let lastUpstream: Response | null = null;
  let sawNetworkError = false;
  const triedKeys = new Set<string>();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const apiKey = await getNextApiKey(triedKeys.size > 0 ? triedKeys : undefined);
    if (!apiKey) break;
    triedKeys.add(apiKey);

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
        const reason =
          res.status === 402
            ? "HTTP 402: Créditos esgotados (cooldown 15m)"
            : "HTTP 429: Rate limit / Cota atingida (cooldown 15m)";
        await markKeyStatus(apiKey, "exhausted", reason);
        continue;
      }

      if (res.status === 401 || res.status === 403) {
        await markKeyStatus(
          apiKey,
          "disabled",
          `HTTP ${res.status}: Chave rejeitada pelo gateway`,
        );
        continue;
      }

      if (res.status >= 500 && attempt < maxAttempts) {
        continue;
      }

      return { upstream: res, networkError: false };
    } catch {
      sawNetworkError = true;
      continue;
    }
  }

  return {
    upstream: lastUpstream,
    networkError: !lastUpstream && sawNetworkError,
  };
}

/* ─────────────── Passo 3: Auto-registro quando rodar como Filho ─────────── */

let lastHandshakeAt = 0;
const HANDSHAKE_TTL_MS = 10 * 60 * 1000; // re-sincroniza a cada 10 min

export async function maybeAutoRegisterChild(requestUrl: string): Promise<void> {
  const now = Date.now();
  if (now - lastHandshakeAt < HANDSHAKE_TTL_MS) return;

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
    lastHandshakeAt = now;
    return;
  }

  const apiKey = process.env["LOVABLE_API_KEY"]?.trim();
  if (!apiKey) return;

  lastHandshakeAt = now;
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
    lastHandshakeAt = 0;
  }
}
