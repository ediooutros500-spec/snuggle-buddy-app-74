/**
 * POST /api/public/v1/workers/register
 * GET  /api/public/v1/workers/register
 *
 * Endpoint de recepção de chaves dos workers (Passo 2) e consulta de métricas
 * com chaves mascaradas para o Painel Visual da Central (Passo 5).
 */
import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, isAuthorized } from "@/lib/claude-compat.server";
import { getPoolAdmin, verifySyncToken } from "@/lib/key-pool.server";

const REGISTER_CORS_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-remix-sync-token, content-type, anthropic-version",
};

function maskApiKey(key: string): string {
  const clean = key.trim();
  if (clean.length <= 8) return "lov_...****";
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

export const Route = createFileRoute("/api/public/v1/workers/register")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: REGISTER_CORS_HEADERS }),

      GET: async () => {
        const pool = getPoolAdmin();
        if (!pool) {
          return new Response(
            JSON.stringify({
              configured: false,
              metrics: { active: 0, exhausted: 0, totalRequests: 0 },
              workers: [],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
            },
          );
        }

        const { data, error } = await pool
          .from("gateway_key_pool")
          .select(
            "id, api_key, project_origin, status, total_requests, last_used_at, last_error, exhausted_at, created_at",
          )
          .order("created_at", { ascending: true });

        if (error) {
          return new Response(
            JSON.stringify({ error: "Falha ao carregar pool de chaves." }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
            },
          );
        }

        const rows = data ?? [];
        const active = rows.filter((r) => r.status === "active").length;
        const exhausted = rows.filter((r) => r.status === "exhausted").length;
        const totalRequests = rows.reduce(
          (acc, r) => acc + Number(r.total_requests ?? 0),
          0,
        );

        const workers = rows.map((r, idx) => ({
          id: r.id,
          name: `Remix #${idx + 1}`,
          project_origin: r.project_origin ?? "desconhecido",
          masked_key: maskApiKey(String(r.api_key ?? "")),
          status: r.status,
          total_requests: Number(r.total_requests ?? 0),
          last_used_at: r.last_used_at,
          last_error: r.last_error,
          exhausted_at: r.exhausted_at,
          created_at: r.created_at,
        }));

        return new Response(
          JSON.stringify({
            configured: true,
            metrics: { active, exhausted, totalRequests },
            workers,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
          },
        );
      },

      POST: async ({ request }) => {
        const pool = getPoolAdmin();
        if (!pool) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Pool Supabase secondary client not configured",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
            },
          );
        }

        let body: {
          action?: "reactivate";
          id?: string;
          api_key?: string;
          project_origin?: string;
        };
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({ success: false, message: "Invalid JSON payload" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
            },
          );
        }

        // Ação do Painel (Passo 5): reativar manualmente uma chave esgotada
        if (body.action === "reactivate" && typeof body.id === "string" && body.id) {
          const { error } = await pool
            .from("gateway_key_pool")
            .update({
              status: "active",
              exhausted_at: null,
              last_error: null,
            })
            .eq("id", body.id);

          if (error) {
            return new Response(
              JSON.stringify({ success: false, message: "Failed to reactivate worker" }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
              },
            );
          }

          return new Response(
            JSON.stringify({ success: true, message: "Worker reactivated in pool" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
            },
          );
        }

        // Passo 2.1: Autenticação do Registro via x-remix-sync-token (ou token admin)
        if (!verifySyncToken(request) && !isAuthorized(request)) {
          return new Response(
            JSON.stringify({ success: false, message: "Unauthorized sync token" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
            },
          );
        }

        // Passo 2.2: Validação do Payload
        const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
        const projectOrigin =
          typeof body.project_origin === "string" && body.project_origin.trim()
            ? body.project_origin.trim()
            : "unknown";

        if (!apiKey || apiKey.length < 8) {
          return new Response(
            JSON.stringify({ success: false, message: "Invalid or empty api_key" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
            },
          );
        }

        // Passo 2.3: Persistência Inteligente (Upsert)
        const { error } = await pool.from("gateway_key_pool").upsert(
          {
            api_key: apiKey,
            project_origin: projectOrigin,
            status: "active",
            exhausted_at: null,
            last_error: null,
          },
          { onConflict: "api_key" },
        );

        if (error) {
          return new Response(
            JSON.stringify({ success: false, message: "Database upsert error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
            },
          );
        }

        // Passo 2.4: Resposta Segura (sem ecoar a chave)
        return new Response(
          JSON.stringify({
            success: true,
            message: "Worker registered in pool",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...REGISTER_CORS_HEADERS },
          },
        );
      },
    },
  },
});
