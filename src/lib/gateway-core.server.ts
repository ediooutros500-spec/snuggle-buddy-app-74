/**
 * 9Router Gateway Core Engine — Governança Multi-Tenant, Cache TTL, Quota,
 * Rate-Limit com Headers Padrão (RFC/OpenAI/Anthropic) e Telemetria Completa.
 */
import { getPoolAdmin } from "./key-pool.server";
import {
  DEFAULT_MODEL,
  extractToken,
  rateLimitKey,
  resolveModel,
  safeEqual,
  type Accumulated,
} from "./claude-compat.server";

export interface GatewayClientInfo {
  id: string;
  name: string;
  status: string;
  allowed_models: string[] | null;
  rate_limit_rpm: number;
  quota_limit_requests: number | null;
  total_requests: number;
}

export interface GatewaySettingsInfo {
  default_model: string;
  disabled_models: string[];
  global_rate_limit_rpm: number;
  cooldown_minutes: number;
}

export interface GatewayAuthResult {
  authorized: boolean;
  isAdmin: boolean;
  quotaExceeded?: boolean;
  client?: GatewayClientInfo;
}

const CACHE_TTL_MS = 20_000;
let _settingsCache: { data: GatewaySettingsInfo; expiresAt: number } | null = null;
const _clientCache = new Map<string, { data: GatewayClientInfo; expiresAt: number }>();

export function invalidateGatewayCache() {
  _settingsCache = null;
  _clientCache.clear();
}

export async function getGatewaySettings(): Promise<GatewaySettingsInfo> {
  const now = Date.now();
  if (_settingsCache && _settingsCache.expiresAt > now) return _settingsCache.data;

  const fallback: GatewaySettingsInfo = {
    default_model: DEFAULT_MODEL,
    disabled_models: [],
    global_rate_limit_rpm: 120,
    cooldown_minutes: 15,
  };

  const pool = getPoolAdmin();
  if (!pool) return fallback;

  try {
    const { data, error } = await pool
      .from("gateway_settings")
      .select("default_model, disabled_models, global_rate_limit_rpm, cooldown_minutes")
      .eq("id", 1)
      .single();

    if (!error && data) {
      const resolved: GatewaySettingsInfo = {
        default_model: data.default_model || DEFAULT_MODEL,
        disabled_models: Array.isArray(data.disabled_models) ? data.disabled_models : [],
        global_rate_limit_rpm: Number(data.global_rate_limit_rpm) || 120,
        cooldown_minutes: Number(data.cooldown_minutes) || 15,
      };
      _settingsCache = { data: resolved, expiresAt: now + CACHE_TTL_MS };
      return resolved;
    }
  } catch {
    // fallback silencioso
  }
  return fallback;
}

export async function authenticate9Router(request: Request): Promise<GatewayAuthResult> {
  const token = extractToken(request);
  if (!token) return { authorized: false, isAdmin: false };

  const adminExpected = process.env["CLAUDE_CODE_GATEWAY_TOKEN"];
  if (adminExpected && safeEqual(token, adminExpected)) {
    return { authorized: true, isAdmin: true };
  }

  const now = Date.now();
  const cached = _clientCache.get(token);
  if (cached && cached.expiresAt > now) {
    const c = cached.data;
    if (c.status !== "active") return { authorized: false, isAdmin: false };
    if (c.quota_limit_requests != null && c.total_requests >= c.quota_limit_requests) {
      return { authorized: false, isAdmin: false, quotaExceeded: true, client: c };
    }
    return { authorized: true, isAdmin: false, client: c };
  }

  const pool = getPoolAdmin();
  if (pool) {
    try {
      const { data, error } = await pool
        .from("gateway_clients")
        .select(
          "id, name, status, allowed_models, rate_limit_rpm, quota_limit_requests, total_requests",
        )
        .eq("client_key", token)
        .single();

      if (!error && data) {
        const client: GatewayClientInfo = {
          id: data.id,
          name: data.name,
          status: data.status,
          allowed_models: data.allowed_models,
          rate_limit_rpm: Number(data.rate_limit_rpm) || 60,
          quota_limit_requests:
            data.quota_limit_requests == null ? null : Number(data.quota_limit_requests),
          total_requests: Number(data.total_requests ?? 0),
        };
        _clientCache.set(token, { data: client, expiresAt: now + CACHE_TTL_MS });

        if (client.status !== "active") return { authorized: false, isAdmin: false };
        if (
          client.quota_limit_requests != null &&
          client.total_requests >= client.quota_limit_requests
        ) {
          return { authorized: false, isAdmin: false, quotaExceeded: true, client };
        }
        return { authorized: true, isAdmin: false, client };
      }
    } catch {
      // silencioso
    }
  }

  return { authorized: false, isAdmin: false };
}

const WINDOW_MS = 60_000;
const clientBuckets = new Map<string, number[]>();

export interface RateLimitDecision {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  headers: Record<string, string>;
}

export function enforceGatewayRateLimit(
  request: Request,
  auth: GatewayAuthResult,
  settings: GatewaySettingsInfo,
): RateLimitDecision {
  const limit = auth.client?.rate_limit_rpm || settings.global_rate_limit_rpm || 120;
  const bucketKey = auth.client ? `client:${auth.client.id}` : `ip:${rateLimitKey(request)}`;
  const now = Date.now();
  const hits = (clientBuckets.get(bucketKey) ?? []).filter((t) => now - t < WINDOW_MS);

  if (hits.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - (hits[0] ?? now))) / 1000));
    clientBuckets.set(bucketKey, hits);
    return {
      ok: false,
      limit,
      remaining: 0,
      retryAfter,
      headers: {
        "Retry-After": String(retryAfter),
        "x-ratelimit-limit-requests": String(limit),
        "x-ratelimit-remaining-requests": "0",
        "x-ratelimit-reset-requests": `${retryAfter}s`,
      },
    };
  }

  hits.push(now);
  clientBuckets.set(bucketKey, hits);
  if (clientBuckets.size > 5_000) clientBuckets.clear();

  const remaining = Math.max(0, limit - hits.length);
  const resetSec = Math.max(1, Math.ceil((WINDOW_MS - (now - (hits[0] ?? now))) / 1000));
  return {
    ok: true,
    limit,
    remaining,
    retryAfter: 0,
    headers: {
      "x-ratelimit-limit-requests": String(limit),
      "x-ratelimit-remaining-requests": String(remaining),
      "x-ratelimit-reset-requests": `${resetSec}s`,
    },
  };
}

export function resolve9RouterModel(
  requestedModel: string | undefined,
  settings: GatewaySettingsInfo,
  client?: GatewayClientInfo,
): { model: string | null; reason?: "invalid_or_disabled" | "forbidden_for_client" } {
  const effectiveInput = requestedModel?.trim() || settings.default_model || DEFAULT_MODEL;
  const resolved = resolveModel(effectiveInput, settings.disabled_models);
  if (!resolved) return { model: null, reason: "invalid_or_disabled" };

  if (client?.allowed_models && client.allowed_models.length > 0) {
    if (
      !client.allowed_models.includes(resolved) &&
      !client.allowed_models.includes(effectiveInput)
    ) {
      return { model: null, reason: "forbidden_for_client" };
    }
  }
  return { model: resolved };
}

export async function recordGatewayTelemetry(params: {
  auth: GatewayAuthResult;
  endpoint: string;
  requestedModel?: string;
  resolvedModel: string;
  statusCode: number;
  latencyMs: number;
  acc?: Accumulated;
  errorMessage?: string | null;
}): Promise<void> {
  const pool = getPoolAdmin();
  if (!pool) return;

  const inTok = params.acc?.usage.input_tokens ?? 0;
  const outTok = params.acc?.usage.output_tokens ?? 0;

  try {
    if (params.auth.client) {
      params.auth.client.total_requests += 1;
      await Promise.allSettled([
        pool.rpc("increment_client_stats", {
          p_client_id: params.auth.client.id,
          p_reqs: 1,
          p_in_tok: inTok,
          p_out_tok: outTok,
        }),
        pool.from("gateway_request_logs").insert({
          client_id: params.auth.client.id,
          client_name: params.auth.client.name,
          endpoint: params.endpoint,
          requested_model: params.requestedModel || "default",
          resolved_model: params.resolvedModel,
          status_code: params.statusCode,
          latency_ms: params.latencyMs,
          input_tokens: inTok,
          output_tokens: outTok,
          error_message: params.errorMessage ?? null,
        }),
      ]);
    } else {
      await pool.from("gateway_request_logs").insert({
        client_name: "Admin (Master Token)",
        endpoint: params.endpoint,
        requested_model: params.requestedModel || "default",
        resolved_model: params.resolvedModel,
        status_code: params.statusCode,
        latency_ms: params.latencyMs,
        input_tokens: inTok,
        output_tokens: outTok,
        error_message: params.errorMessage ?? null,
      });
    }
  } catch {
    // telemetria nunca derruba o request
  }
}
