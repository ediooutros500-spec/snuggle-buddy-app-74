import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, isAuthorized } from "@/lib/claude-compat.server";
import { getPoolAdmin } from "@/lib/key-pool.server";
import { verifyIncomingHandshake } from "@/lib/registration-auth.server";

const HEADERS = {
  ...CORS_HEADERS,
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-remix-sync-token, x-handshake-origin, x-handshake-timestamp, x-handshake-nonce, x-handshake-signature, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...HEADERS },
  });

const registrations = new Map<string, number[]>();
function allowedRegistration(bucket: string, limit: number): boolean {
  const now = Date.now();
  for (const [name, hits] of registrations)
    if (!hits.some((t) => now - t < 60_000)) registrations.delete(name);
  const hits = (registrations.get(bucket) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= limit || (!registrations.has(bucket) && registrations.size >= 5000))
    return false;
  hits.push(now);
  registrations.set(bucket, hits);
  return true;
}

async function validateUpstreamKey(
  apiKey: string,
): Promise<
  { status: "active" | "exhausted"; error?: string } | { invalid: true } | { unavailable: true }
> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
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
    await response.body?.cancel();
    if (response.status === 401 || response.status === 403) return { invalid: true };
    if (response.status === 402 || response.status === 429)
      return { status: "exhausted", error: `Validação upstream retornou HTTP ${response.status}` };
    if (response.ok) return { status: "active" };
    return { unavailable: true };
  } catch {
    return { unavailable: true };
  }
}

export const Route = createFileRoute("/api/public/v1/workers/register")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);
        const pool = getPoolAdmin();
        if (!pool)
          return json({
            configured: false,
            metrics: { active: 0, exhausted: 0, totalRequests: 0 },
            workers: [],
          });
        const { data, error } = await pool
          .from("gateway_key_pool")
          .select(
            "id,key_hint,project_origin,status,total_requests,daily_request_limit,requests_today,usage_date,last_used_at,last_error,exhausted_at,created_at",
          )
          .order("created_at", { ascending: true });
        if (error) return json({ error: "Falha ao carregar pool de chaves." }, 500);
        const rows = data ?? [];
        return json({
          configured: true,
          metrics: {
            active: rows.filter((r) => r.status === "active").length,
            exhausted: rows.filter((r) => r.status === "exhausted").length,
            totalRequests: rows.reduce((n, r) => n + Number(r.total_requests ?? 0), 0),
          },
          workers: rows.map((r, idx) => ({
            id: r.id,
            name: `Remix #${idx + 1}`,
            project_origin: r.project_origin ?? "desconhecido",
            key_hint: r.key_hint,
            status: r.status,
            total_requests: Number(r.total_requests ?? 0),
            daily_request_limit: r.daily_request_limit,
            requests_today: Number(r.requests_today ?? 0),
            usage_date: r.usage_date,
            last_used_at: r.last_used_at,
            last_error: r.last_error,
            exhausted_at: r.exhausted_at,
            created_at: r.created_at,
          })),
        });
      },
      PATCH: async ({ request }) => {
        if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);
        const body = (await request.json().catch(() => null)) as {
          id?: string;
          daily_request_limit?: number | null;
        } | null;
        if (
          !body?.id ||
          (body.daily_request_limit !== null &&
            body.daily_request_limit !== undefined &&
            (!Number.isInteger(body.daily_request_limit) || body.daily_request_limit < 0))
        )
          return json({ error: "id and valid daily_request_limit are required" }, 400);
        const pool = getPoolAdmin();
        if (!pool) return json({ error: "Pool unavailable" }, 503);
        const { error } = await pool
          .from("gateway_key_pool")
          .update({ daily_request_limit: body.daily_request_limit ?? null })
          .eq("id", body.id);
        return error ? json({ error: "Failed to update worker quota" }, 400) : json({ ok: true });
      },
      POST: async ({ request }) => {
        const pool = getPoolAdmin();
        if (!pool)
          return json(
            { success: false, message: "Pool Supabase secondary client not configured" },
            500,
          );
        // This framework does not expose a trusted socket IP; forwarded headers cannot bypass this cap.
        if (!allowedRegistration("global", 30))
          return json({ success: false, message: "Registration rate limit exceeded" }, 429);
        const body = (await request.json().catch(() => null)) as {
          action?: "reactivate";
          id?: string;
          api_key?: string;
          project_origin?: string;
        } | null;
        if (!body) return json({ success: false, message: "Invalid JSON payload" }, 400);
        if (body.action === "reactivate" && body.id) {
          if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);
          const { error } = await pool
            .from("gateway_key_pool")
            .update({ status: "active", exhausted_at: null, last_error: null })
            .eq("id", body.id);
          return error
            ? json({ success: false, message: "Failed to reactivate worker" }, 500)
            : json({ success: true, message: "Worker reactivated in pool" });
        }
        const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
        const origin =
          typeof body.project_origin === "string" ? body.project_origin.trim() : "unknown";
        if (!apiKey || apiKey.length < 8 || apiKey.length > 8192)
          return json({ success: false, message: "Invalid or empty api_key" }, 400);

        const hs = await verifyIncomingHandshake(request, apiKey, origin);
        if (!hs.ok)
          return json({ success: false, message: hs.reason ?? "Unauthorized handshake" }, 401);

        if (!allowedRegistration(`origin:${origin}`, 3))
          return json({ success: false, message: "Origin registration rate limit exceeded" }, 429);

        const validation = await validateUpstreamKey(apiKey);
        if ("unavailable" in validation)
          return json({ success: false, message: "Upstream validation unavailable" }, 503);
        if ("invalid" in validation)
          return json({ success: false, message: "invalid api_key" }, 400);
        const { data: keyPoolId, error } = await pool.rpc("register_worker_key", {
          p_api_key: apiKey,
          p_origin: origin,
          p_status: validation.status,
          p_error: validation.error ?? null,
        });
        if (error || typeof keyPoolId !== "string")
          return json({ error: "Database registration error" }, 503);
        const worker = await pool
          .from("gateway_workers")
          .select("id")
          .eq("key_pool_id", keyPoolId)
          .eq("origin", origin)
          .single();
        if (worker.error || !worker.data?.id)
          return json({ error: "Worker lookup unavailable" }, 503);
        return json({ registered: true, worker_id: worker.data.id, status: validation.status });
      },
    },
  },
});
