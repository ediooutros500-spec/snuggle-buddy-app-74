import { getPoolAdmin } from "./key-pool.server";
import {
  ALLOWED_MODELS,
  CORS_HEADERS,
  DEFAULT_MODEL,
  MODEL_ALIASES,
  resolveModel,
} from "./claude-compat.server";

export type GatewayAuth = Awaited<
  ReturnType<typeof import("./claude-compat.server").authenticateGatewayRequest>
>;
export type GatewaySettings = {
  default_model: string;
  disabled_models: string[];
  global_rate_limit_rpm: number;
  cooldown_minutes: number;
};
export const MEDIA_MODELS = {
  image: ["openai/gpt-image-2.5-sunburst", "openai/gpt-image-2.5-flare"],
  embedding: ["openai/text-embedding-3-small", "openai/text-embedding-3-large"],
  video: [
    "google/veo-3.1",
    "google/veo-3.1-fast",
    "google/veo-3.1-lite",
    "google/gemini-omni-1.1-flash",
  ],
};
export const MODEL_CATALOG = [
  ...ALLOWED_MODELS.map((id) => ({ id, kind: "text" })),
  ...Object.entries(MEDIA_MODELS).flatMap(([kind, ids]) => ids.map((id) => ({ id, kind }))),
];
export class GatewayPolicyError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function readGatewaySettings(): Promise<GatewaySettings> {
  const pool = getPoolAdmin();
  if (!pool)
    throw new GatewayPolicyError(
      503,
      "policy_unavailable",
      "Configuração do gateway indisponível.",
    );
  const { data, error } = await pool
    .from("gateway_settings")
    .select("default_model,disabled_models,global_rate_limit_rpm,cooldown_minutes")
    .eq("id", 1)
    .single();
  if (
    error ||
    !data ||
    !Number.isInteger(data.global_rate_limit_rpm) ||
    data.global_rate_limit_rpm < 1 ||
    !Array.isArray(data.disabled_models)
  )
    throw new GatewayPolicyError(
      503,
      "policy_unavailable",
      "Configuração do gateway indisponível.",
    );
  return { ...data, default_model: data.default_model || DEFAULT_MODEL };
}
export function modelPermitted(
  model: string,
  auth: GatewayAuth,
  settings: GatewaySettings,
): boolean {
  const canonical = MODEL_ALIASES[model] ?? model;
  return (
    MODEL_CATALOG.some((x) => x.id === canonical) &&
    !settings.disabled_models.some((x) => (MODEL_ALIASES[x] ?? x) === canonical) &&
    (!auth.client?.allowed_models?.length ||
      auth.client.allowed_models.some((x) => (MODEL_ALIASES[x] ?? x) === canonical))
  );
}
export function resolvePolicyModel(
  model: string | undefined,
  auth: GatewayAuth,
  settings: GatewaySettings,
): string {
  const resolved = resolveModel(model, settings.disabled_models, settings.default_model);
  if (!resolved)
    throw new GatewayPolicyError(400, "model_not_found", "Modelo não permitido ou desabilitado.");
  if (!modelPermitted(resolved, auth, settings))
    throw new GatewayPolicyError(
      403,
      "permission_denied",
      "Seu cliente não possui permissão para usar este modelo.",
    );
  return resolved;
}
// One shared limiter for all public endpoints in the single deployed parent process.
// Durable/distributed RPM and concurrency reservations remain an explicit E2 follow-up.
const rateBuckets = new Map<string, number[]>();
export function enforcePolicyRate(auth: GatewayAuth, settings: GatewaySettings): void {
  const now = Date.now();
  for (const [key, hits] of rateBuckets)
    if (!hits.length || hits[hits.length - 1]! <= now - 60000) rateBuckets.delete(key);
  const entries: [string, number][] = [
    ["global", settings.global_rate_limit_rpm],
    [auth.client ? `client:${auth.client.id}` : "maintenance", auth.client?.rate_limit_rpm || 120],
  ];
  const next = entries.map(([key, limit]) => {
    const hits = (rateBuckets.get(key) ?? []).filter((at) => at > now - 60000);
    if (hits.length >= limit || (!rateBuckets.has(key) && rateBuckets.size >= 5000))
      throw new GatewayPolicyError(429, "rate_limit_exceeded", "Limite de requisições atingido.");
    return { key, hits };
  });
  for (const { key, hits } of next) rateBuckets.set(key, [...hits, now]);
}
// Atomic compare-and-swap in Postgres through REST; survives restarts and multiple callers.
// Counts admitted generation attempts once, regardless of retries/provider outcome.
// No automatic refund after uncertain provider outcomes. Reconciliation is a separate E2 task.
export async function admitClientAttempt(auth: GatewayAuth): Promise<void> {
  if (!auth.client) return;
  const pool = getPoolAdmin();
  if (!pool)
    throw new GatewayPolicyError(503, "quota_unavailable", "Não foi possível verificar a quota.");
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await pool
      .from("gateway_clients")
      .select("id,status,total_requests,quota_limit_requests")
      .eq("id", auth.client.id)
      .single();
    if (error || !data)
      throw new GatewayPolicyError(503, "quota_unavailable", "Não foi possível verificar a quota.");
    if (data.status !== "active")
      throw new GatewayPolicyError(401, "invalid_api_key", "Cliente suspenso.");
    const used = Number(data.total_requests);
    const limit = data.quota_limit_requests == null ? null : Number(data.quota_limit_requests);
    if (
      !Number.isSafeInteger(used) ||
      used < 0 ||
      (limit !== null && (!Number.isSafeInteger(limit) || limit < 0))
    )
      throw new GatewayPolicyError(
        503,
        "quota_unavailable",
        "Quota inválida; contate o administrador.",
      );
    if (limit !== null && used >= limit)
      throw new GatewayPolicyError(
        429,
        "insufficient_quota",
        "Quota de requisições do cliente atingida.",
      );
    if (used >= Number.MAX_SAFE_INTEGER)
      throw new GatewayPolicyError(
        503,
        "quota_unavailable",
        "Contador de consumo fora do intervalo suportado.",
      );
    let query = pool
      .from("gateway_clients")
      .update({ total_requests: used + 1, last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("status", "active")
      .eq("total_requests", used);
    query =
      limit === null
        ? query.is("quota_limit_requests", null)
        : query.eq("quota_limit_requests", limit);
    const updated = await query.select("id");
    if (updated.error)
      throw new GatewayPolicyError(503, "quota_unavailable", "Não foi possível reservar a quota.");
    if (updated.data?.length === 1) return;
  }
  throw new GatewayPolicyError(503, "quota_busy", "Consumo concorrente; tente novamente.");
}
export async function admitModelAttempt(
  model: string,
  auth: GatewayAuth,
  settings: GatewaySettings,
): Promise<void> {
  if (!modelPermitted(model, auth, settings))
    throw new GatewayPolicyError(
      403,
      "permission_denied",
      "Modelo bloqueado ou não permitido ao cliente.",
    );
  enforcePolicyRate(auth, settings);
  await admitClientAttempt(auth);
}
export function policyErrorResponse(error: unknown): Response {
  const known = error instanceof GatewayPolicyError;
  const status = known ? error.status : 503;
  return new Response(
    JSON.stringify({
      type: "error",
      error: {
        type: known ? error.code : "policy_unavailable",
        message: known ? error.message : "Não foi possível verificar as políticas do gateway.",
      },
    }),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "content-type": "application/json",
        "cache-control": "no-store",
        ...(status === 429 ? { "retry-after": "60" } : {}),
      },
    },
  );
}
export function settingsPatch(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const allowed = new Set(["action", "default_model", "disabled_models", "global_rate_limit_rpm"]);
  if (Object.keys(body).some((k) => !allowed.has(k)))
    throw new Error("Campo de configuração não editável nesta etapa.");
  if ("default_model" in body) {
    if (
      typeof body["default_model"] !== "string" ||
      !(ALLOWED_MODELS as readonly string[]).includes(body["default_model"])
    )
      throw new Error("Selecione um modelo de texto do catálogo.");
    patch["default_model"] = body["default_model"];
  }
  if ("disabled_models" in body) {
    if (
      !Array.isArray(body["disabled_models"]) ||
      body["disabled_models"].length > MODEL_CATALOG.length ||
      body["disabled_models"].some(
        (x) => typeof x !== "string" || !MODEL_CATALOG.some((m) => m.id === x),
      )
    )
      throw new Error("Lista de modelos inválida.");
    patch["disabled_models"] = [...new Set(body["disabled_models"])];
  }
  if ("global_rate_limit_rpm" in body) {
    if (
      !Number.isInteger(body["global_rate_limit_rpm"]) ||
      Number(body["global_rate_limit_rpm"]) < 1 ||
      Number(body["global_rate_limit_rpm"]) > 10000
    )
      throw new Error("RPM deve ser inteiro entre 1 e 10000.");
    patch["global_rate_limit_rpm"] = body["global_rate_limit_rpm"];
  }
  if (!Object.keys(patch).length) throw new Error("Nenhum campo editável informado.");
  return patch;
}

export function clientPatch(
  body: Record<string, unknown>,
  create = false,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (create || "name" in body) {
    if (typeof body["name"] !== "string" || !body["name"].trim() || body["name"].length > 200)
      throw new Error("Nome obrigatório, até 200 caracteres.");
    patch["name"] = body["name"].trim();
  }
  if ("rate_limit_rpm" in body) {
    const rpm = body["rate_limit_rpm"];
    if (!Number.isInteger(rpm) || Number(rpm) < 1 || Number(rpm) > 10000)
      throw new Error("RPM deve ser inteiro entre 1 e 10000.");
    patch["rate_limit_rpm"] = rpm;
  } else if (create) patch["rate_limit_rpm"] = 60;
  if ("quota_limit_requests" in body) {
    const quota = body["quota_limit_requests"];
    if (quota !== null && (!Number.isSafeInteger(quota) || Number(quota) < 0))
      throw new Error("Quota deve ser um inteiro não negativo ou nula.");
    patch["quota_limit_requests"] = quota;
  } else if (create) patch["quota_limit_requests"] = null;
  if ("allowed_models" in body) {
    const values = body["allowed_models"];
    if (
      values !== null &&
      (!Array.isArray(values) ||
        values.length > MODEL_CATALOG.length ||
        values.some((x) => typeof x !== "string" || !MODEL_CATALOG.some((m) => m.id === x)))
    )
      throw new Error("Modelos do cliente inválidos.");
    patch["allowed_models"] = values === null ? null : [...new Set(values as string[])];
  } else if (create) patch["allowed_models"] = null;
  if ("notes" in body) {
    if (
      body["notes"] !== null &&
      (typeof body["notes"] !== "string" || body["notes"].length > 2000)
    )
      throw new Error("Notas devem ter até 2000 caracteres.");
    patch["notes"] = body["notes"];
  }
  if ("status" in body) {
    if (!["active", "suspended"].includes(String(body["status"])))
      throw new Error("Status inválido.");
    patch["status"] = body["status"];
  }
  if (!Object.keys(patch).length) throw new Error("Nenhum campo editável informado.");
  return patch;
}
