import { getPoolAdmin } from "./key-pool.server";
import { authorizeAdmin, adminJson } from "./admin-auth.server";
import { recordAdminAudit, nameGatewayAccounts } from "./admin-store.server";
import { isAllowedChildOrigin } from "./child-config.server";
import { clientKeyHint } from "./client-keys.server";
import { MODEL_CATALOG } from "./gateway-policy.server";
import { listClientAccess } from "./client-access.server";

const credentialAttempts = new Map<string, { count: number; expires: number }>();

const LOG_FIELDS =
  "id,request_id,client_id,client_name,endpoint,requested_model,resolved_model,status_code,latency_ms,input_tokens,output_tokens,error_message,created_at,worker_key_hint";
const CREDENTIAL_FIELDS =
  "id,key_hint,project_origin,status,total_requests,daily_request_limit,requests_today,usage_date,last_used_at,last_error,exhausted_at,created_at,workspace_label,account_label";
function number(value: string | null, fallback: number, max: number) {
  const n = Number(value);
  return value && Number.isInteger(n) && n >= 0 ? Math.min(n, max) : fallback;
}
type AdminQuery = ReturnType<
  ReturnType<NonNullable<ReturnType<typeof getPoolAdmin>>["from"]>["select"]
>;
type UsageLog = {
  status_code: number | null;
  error_message?: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  resolved_model: string | null;
  client_name: string | null;
  created_at: string;
};
type UsageGroup = {
  name: string;
  requests: number;
  errors: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  measuredLatency: number;
  unknownUsage: number;
  completeTokens: number;
};
function filtered(query: AdminQuery, url: URL) {
  const days = number(url.searchParams.get("days"), 7, 90) || 1;
  query = query.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
  for (const field of ["client_id", "resolved_model"]) {
    const value = url.searchParams.get(field);
    if (value && value.length <= 200) query = query.eq(field, value);
  }
  const status = url.searchParams.get("status");
  if (status === "error") query = query.gte("status_code", 400);
  if (status === "success") query = query.lt("status_code", 400);
  const search = url.searchParams.get("q")?.trim();
  if (search)
    query = query.ilike("client_name", `%${search.slice(0, 100).replace(/[%_\\]/g, "\\$&")}%`);
  return query;
}
export function summarizeUsage(rows: UsageLog[]) {
  const models = new Map<string, UsageGroup>(),
    clients = new Map<string, UsageGroup>(),
    hours = new Map<string, UsageGroup>(),
    days = new Map<string, UsageGroup>();
  const total = {
    requests: rows.length,
    success: 0,
    errors: 0,
    inputTokens: 0,
    outputTokens: 0,
    unknownUsage: 0,
    latencyMs: 0,
    measuredLatency: 0,
  };
  for (const r of rows) {
    const failed = Number(r.status_code) >= 400 || Boolean(r.error_message);
    total[failed ? "errors" : "success"]++;
    const input = r.input_tokens == null || r.input_tokens < 0 ? null : Number(r.input_tokens),
      output = r.output_tokens == null || r.output_tokens < 0 ? null : Number(r.output_tokens);
    if (input === null || output === null) total.unknownUsage++;
    total.inputTokens += input || 0;
    total.outputTokens += output || 0;
    total.latencyMs += Number(r.latency_ms) || 0;
    if (r.latency_ms != null) total.measuredLatency++;
    const local = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(r.created_at))
        .map((part) => [part.type, part.value]),
    );
    for (const [map, key] of [
      [models, r.resolved_model || "Não resolvido"],
      [clients, r.client_name || "Manutenção"],
      [hours, `${local["year"]}-${local["month"]}-${local["day"]} ${local["hour"]}:00`],
      [
        days,
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(r.created_at)),
      ],
    ] as [Map<string, UsageGroup>, string][]) {
      const item = map.get(key) || {
        name: key,
        requests: 0,
        errors: 0,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        measuredLatency: 0,
        unknownUsage: 0,
        completeTokens: 0,
      };
      item.requests++;
      if (failed) item.errors++;
      item.inputTokens += input || 0;
      item.outputTokens += output || 0;
      if (r.latency_ms != null) {
        item.latencyMs += Number(r.latency_ms);
        item.measuredLatency++;
      }
      if (input === null || output === null) item.unknownUsage++;
      else item.completeTokens += input + output;
      map.set(key, item);
    }
  }
  return {
    ...total,
    averageLatencyMs: total.measuredLatency
      ? Math.round(total.latencyMs / total.measuredLatency)
      : null,
    byModel: [...models.values()].sort((a, b) => b.requests - a.requests),
    byClient: [...clients.values()].sort((a, b) => b.requests - a.requests),
    byHour: [...hours.values()].sort((a, b) => a.name.localeCompare(b.name)),
    byDay: [...days.values()].sort((a, b) => a.name.localeCompare(b.name)),
    costUsd: null,
  };
}
export async function handleAdminResource(request: Request, resource: string): Promise<Response> {
  const write = !["GET", "HEAD"].includes(request.method);
  const auth = await authorizeAdmin(request, write ? "write" : "read");
  if (!auth.ok) return adminJson({ error: "Acesso não permitido." }, auth.status);
  const pool = getPoolAdmin();
  if (!pool) return adminJson({ error: "Banco administrativo indisponível." }, 503);
  const url = new URL(request.url);
  try {
    if (resource === "system" && request.method === "GET") {
      const [settings, credentials, clients] = await Promise.all([
        pool
          .from("gateway_settings")
          .select("default_model,disabled_models,global_rate_limit_rpm,cooldown_minutes")
          .eq("id", 1)
          .single(),
        pool
          .from("gateway_key_pool")
          .select("id,status,daily_request_limit,requests_today,usage_date"),
        pool.from("gateway_clients").select("id,status,total_requests"),
      ]);
      if (settings.error || credentials.error || clients.error) throw new Error("database_error");
      const today = new Date().toISOString().slice(0, 10);
      const access = await listClientAccess();
      const available = credentials.data.filter(
        (c) =>
          c.status === "active" &&
          (c.daily_request_limit == null ||
            (c.usage_date === today ? Number(c.requests_today) : 0) < c.daily_request_limit),
      ).length;
      return adminJson({
        provider: {
          id: "lovable",
          name: "Lovable AI Gateway",
          strategy: "round_robin",
          automaticRegistration: true,
        },
        addresses: {
          panelUrl: process.env["PARENT_PUBLIC_URL"],
          apiBaseUrl: `${process.env["API_PUBLIC_URL"]?.replace(/\/+$/, "")}/v1`,
        },
        settings: settings.data,
        catalog: MODEL_CATALOG.map((m) => ({
          ...m,
          enabled: !settings.data.disabled_models.includes(m.id),
          availability: "unverified",
        })),
        counts: {
          credentials: credentials.data.length,
          availableCredentials: available,
          clients: clients.data.length,
          activeClients: clients.data.filter(
            (c) =>
              c.status === "active" &&
              (!access[c.id]?.expires_at || Date.parse(access[c.id]!.expires_at!) > Date.now()),
          ).length,
          admittedAttempts: clients.data.reduce((sum, c) => sum + Number(c.total_requests || 0), 0),
        },
        health: { database: true, checkedAt: new Date().toISOString(), ready: available > 0 },
        limits: {
          rpmScope: "single_process",
          quotaBasis: "admitted_attempts",
          cooldownMinutes: 15,
        },
      });
    }
    if (resource === "clients" && request.method === "GET") {
      const page = number(url.searchParams.get("page"), 1, 10000) || 1,
        limit = 25;
      let query = pool
        .from("gateway_clients")
        .select(
          "id,name,client_key,status,allowed_models,rate_limit_rpm,quota_limit_requests,total_requests,last_used_at,notes,created_at",
          { count: "exact" },
        );
      const q = url.searchParams.get("q");
      if (q) query = query.ilike("name", `%${q.slice(0, 100).replace(/[%_\\]/g, "\\$&")}%`);
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      if (error) throw error;
      const access = await listClientAccess();
      return adminJson({
        rows: data.map(({ client_key, ...row }) => ({
          ...row,
          key_hint: clientKeyHint(client_key),
          ...(access[row.id] || {
            expires_at: null,
            device_limit: 0,
            device_count: 0,
            devices: [],
            unidentified_requests: 0,
          }),
        })),
        total: count,
        page,
        limit,
      });
    }
    if (resource === "requests" && request.method === "GET") {
      const page = number(url.searchParams.get("page"), 1, 10000) || 1,
        limit = url.searchParams.get("export") === "csv" ? 1000 : 25;
      const { data, error, count } = await filtered(
        pool.from("gateway_request_logs").select(LOG_FIELDS, { count: "exact" }),
        url,
      )
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      if (error) throw error;
      const rows = (data as Record<string, unknown>[]).map((row) => ({
        ...row,
        input_tokens:
          row["input_tokens"] == null || Number(row["input_tokens"]) < 0
            ? null
            : row["input_tokens"],
        output_tokens:
          row["output_tokens"] == null || Number(row["output_tokens"]) < 0
            ? null
            : row["output_tokens"],
      }));
      if (url.searchParams.get("export") === "csv") {
        const fields = [
          "created_at",
          "request_id",
          "client_name",
          "endpoint",
          "resolved_model",
          "status_code",
          "latency_ms",
          "input_tokens",
          "output_tokens",
          "error_message",
        ];
        const cell = (value: unknown) => {
          let text = String(value ?? "");
          if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
          return '"' + text.replace(/"/g, '""') + '"';
        };
        return new Response(
          [
            fields.join(","),
            ...rows.map((r) =>
              fields.map((f) => cell((r as Record<string, unknown>)[f])).join(","),
            ),
          ].join("\r\n"),
          {
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "content-disposition": "attachment; filename=gateway-requisicoes.csv",
              "cache-control": "no-store",
            },
          },
        );
      }
      return adminJson({ rows, total: count, page, limit });
    }
    if (resource === "usage" && request.method === "GET") {
      const rows: UsageLog[] = [];
      let total = 0;
      for (let offset = 0; offset < 2000; offset += 500) {
        const result = await filtered(
          pool
            .from("gateway_request_logs")
            .select(
              "client_name,resolved_model,status_code,error_message,input_tokens,output_tokens,latency_ms,created_at",
              { count: "exact" },
            ),
          url,
        )
          .order("created_at", { ascending: false })
          .range(offset, offset + 499);
        if (result.error) throw result.error;
        total = result.count || 0;
        rows.push(...(result.data as UsageLog[]));
        if (result.data.length < 500) break;
      }
      return adminJson({
        ...summarizeUsage(rows),
        totalMatching: total,
        sampled: total > rows.length,
        sampleLimit: 2000,
        days: number(url.searchParams.get("days"), 7, 90) || 1,
      });
    }
    if (resource === "credentials" && request.method === "GET") {
      const { data, error } = await pool
        .from("gateway_key_pool")
        .select(CREDENTIAL_FIELDS)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const names = await nameGatewayAccounts(data.map((row) => row.id));
      return adminJson({
        rows: data.map((row) => ({
          ...row,
          account_label: names[row.id],
          workspace_label: null,
        })),
      });
    }
    if (resource === "credentials" && request.method === "DELETE") {
      const raw = await request.text();
      if (raw.length > 4096) return adminJson({ error: "Dados muito grandes." }, 413);
      const body = JSON.parse(raw);
      if (typeof body?.id !== "string" || body.id.length > 100)
        return adminJson({ error: "Conta inválida." }, 400);
      const { data, error } = await pool
        .from("gateway_key_pool")
        .delete()
        .eq("id", body.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return adminJson({ error: "Conta não encontrada." }, 404);
      await recordAdminAudit(auth.actorId, "credential.delete", body.id);
      return adminJson({ ok: true });
    }
    if (resource === "credentials" && request.method === "POST") {
      const raw = await request.text();
      if (raw.length > 16384) return adminJson({ error: "Dados muito grandes." }, 413);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return adminJson({ error: "JSON inválido." }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return adminJson({ error: "Dados inválidos." }, 400);
      for (const field of ["account_label", "workspace_label"])
        if (
          body[field] !== undefined &&
          (typeof body[field] !== "string" || body[field].length > 80)
        )
          return adminJson({ error: "Identificação inválida." }, 400);
      const now = Date.now();
      for (const [id, bucket] of credentialAttempts)
        if (bucket.expires <= now) credentialAttempts.delete(id);
      const bucket = credentialAttempts.get(auth.actorId) || { count: 0, expires: now + 60000 };
      if (bucket.count >= 5 || credentialAttempts.size >= 1000)
        return adminJson({ error: "Aguarde antes de validar outra credencial." }, 429);
      bucket.count++;
      credentialAttempts.set(auth.actorId, bucket);
      const key = typeof body.api_key === "string" ? body.api_key.trim() : "",
        origin =
          typeof body.project_origin === "string"
            ? body.project_origin.trim().replace(/\/+$/, "")
            : "";
      if (key.length < 8 || key.length > 8192 || !isAllowedChildOrigin(origin))
        return adminJson(
          { error: "Informe uma chave válida e a origem HTTPS do seu projeto Lovable." },
          400,
        );
      const validation = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Lovable-API-Key": key,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      await validation.body?.cancel();
      if ([401, 403].includes(validation.status))
        return adminJson({ error: "Chave recusada pelo provedor." }, 400);
      if (!validation.ok && ![402, 429].includes(validation.status))
        return adminJson({ error: "O provedor não confirmou a chave. Nada foi cadastrado." }, 503);
      const status = validation.ok ? "active" : "exhausted";
      const saved = await pool.rpc("register_worker_key", {
        p_api_key: key,
        p_origin: origin,
        p_status: status,
        p_error: status === "exhausted" ? `HTTP ${validation.status}` : null,
      });
      if (saved.error || typeof saved.data !== "string") throw new Error("save_failed");
      const labels = {
        account_label: String(body.account_label || "")
          .trim()
          .slice(0, 80),
        workspace_label: String(body.workspace_label || "")
          .trim()
          .slice(0, 80),
      };
      const metadata = await pool.from("gateway_key_pool").update(labels).eq("id", saved.data);
      if (metadata.error) throw new Error("metadata_failed");
      await recordAdminAudit(auth.actorId, "credential.register", saved.data);
      return adminJson({ ok: true, id: saved.data, status }, 201);
    }
    if (resource === "credentials" && request.method === "PATCH") {
      const raw = await request.text();
      if (raw.length > 4096) return adminJson({ error: "Dados muito grandes." }, 413);
      const body = JSON.parse(raw);
      if (typeof body.id !== "string") return adminJson({ error: "Credencial inválida." }, 400);
      const patch: Record<string, unknown> = {};
      if ("status" in body) {
        if (!["active", "disabled"].includes(body.status))
          return adminJson({ error: "Status inválido." }, 400);
        patch["status"] = body.status;
        if (body.status === "active") {
          patch["exhausted_at"] = null;
          patch["last_error"] = null;
        }
      }
      if ("daily_request_limit" in body) {
        if (
          body.daily_request_limit !== null &&
          (!Number.isSafeInteger(body.daily_request_limit) || body.daily_request_limit < 0)
        )
          return adminJson({ error: "Limite diário inválido." }, 400);
        patch["daily_request_limit"] = body.daily_request_limit;
      }
      for (const field of ["account_label", "workspace_label"])
        if (field in body) {
          if (typeof body[field] !== "string" || body[field].length > 80)
            return adminJson({ error: "Identificação muito longa." }, 400);
          patch[field] = body[field].trim();
        }
      if (!Object.keys(patch).length)
        return adminJson({ error: "Nenhuma alteração informada." }, 400);
      const { data, error } = await pool
        .from("gateway_key_pool")
        .update(patch)
        .eq("id", body.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return adminJson({ error: "Credencial não encontrada." }, 404);
      await recordAdminAudit(auth.actorId, "credential.update", body.id);
      return adminJson({ ok: true });
    }
    return adminJson({ error: "Operação não encontrada." }, 404);
  } catch {
    return adminJson(
      { error: "Não foi possível concluir a operação. Confira os dados e tente novamente." },
      503,
    );
  }
}
