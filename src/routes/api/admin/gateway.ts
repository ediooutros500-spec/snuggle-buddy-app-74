import { createFileRoute } from "@tanstack/react-router";
import { getPoolAdmin } from "@/lib/key-pool.server";
import { safeEqual } from "@/lib/claude-compat.server";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
function authorized(request: Request) { const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? ""; const expected = process.env["CLAUDE_CODE_GATEWAY_TOKEN"] ?? ""; return Boolean(token && expected && safeEqual(token, expected)); }
function makeKey() { return `gw_${crypto.randomUUID().replace(/-/g, "")}`; }

export const Route = createFileRoute("/api/admin/gateway")({ server: { handlers: {
  OPTIONS: async () => new Response(null, { status: 204, headers }),
  GET: async ({ request }) => {
    if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
    const pool = getPoolAdmin(); if (!pool) return json({ error: "Pool unavailable" }, 503);
    const [clients, settings, logs] = await Promise.all([
      pool.from("gateway_clients").select("id,name,client_key,status,allowed_models,rate_limit_rpm,quota_limit_requests,total_requests,total_input_tokens,total_output_tokens,last_used_at,notes,created_at").order("created_at", { ascending: false }),
      pool.from("gateway_settings").select("*").eq("id", 1).single(),
      pool.from("gateway_request_logs").select("id,client_name,endpoint,requested_model,resolved_model,status_code,latency_ms,input_tokens,output_tokens,error_message,created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    if (clients.error || settings.error || logs.error) return json({ error: "Failed to load gateway data" }, 500);
    return json({ clients: clients.data ?? [], settings: settings.data, logs: logs.data ?? [] });
  },
  POST: async ({ request }) => {
    if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
    const pool = getPoolAdmin(); if (!pool) return json({ error: "Pool unavailable" }, 503);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.name !== "string" || !body.name.trim()) return json({ error: "name is required" }, 400);
    const row = { name: body.name.trim(), client_key: typeof body.client_key === "string" && body.client_key.trim() ? body.client_key.trim() : makeKey(), status: "active", allowed_models: Array.isArray(body.allowed_models) ? body.allowed_models : null, rate_limit_rpm: Number(body.rate_limit_rpm) || 60, quota_limit_requests: body.quota_limit_requests == null ? null : Number(body.quota_limit_requests), notes: typeof body.notes === "string" ? body.notes : null };
    const { data, error } = await pool.from("gateway_clients").insert(row).select("id,name,client_key,status,allowed_models,rate_limit_rpm,quota_limit_requests,created_at").single();
    if (error) return json({ error: error.code === "23505" ? "Client key already exists" : "Failed to create client" }, 400);
    return json({ client: data }, 201);
  },
  PATCH: async ({ request }) => {
    if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
    const pool = getPoolAdmin(); if (!pool) return json({ error: "Pool unavailable" }, 503);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json({ error: "Invalid body" }, 400);
    if (body.action === "settings") {
      const patch = { default_model: body["default_model"], disabled_models: Array.isArray(body["disabled_models"]) ? body["disabled_models"] : [], global_rate_limit_rpm: Number(body["global_rate_limit_rpm"]) || 120, cooldown_minutes: Number(body["cooldown_minutes"]) || 15 };
      const { error } = await pool.from("gateway_settings").update(patch).eq("id", 1); return error ? json({ error: "Failed to update settings" }, 400) : json({ ok: true });
    }
    if (typeof body.id !== "string") return json({ error: "id is required" }, 400);
    const patch: Record<string, unknown> = {};
    for (const key of ["name", "status", "allowed_models", "rate_limit_rpm", "quota_limit_requests", "notes"]) if (key in body) patch[key] = body[key];
    const { error } = await pool.from("gateway_clients").update(patch).eq("id", body.id); return error ? json({ error: "Failed to update client" }, 400) : json({ ok: true });
  },
} } });
