import { createFileRoute } from "@tanstack/react-router";
import { getPoolAdmin } from "@/lib/key-pool.server";
import { authorizeAdmin } from "@/lib/admin-auth.server";
import { recordAdminAudit } from "@/lib/admin-store.server";
import { clientKeyHint, createClientKey, storedClientKey } from "@/lib/client-keys.server";
import { MODEL_CATALOG, settingsPatch, clientPatch } from "@/lib/gateway-policy.server";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

export const Route = createFileRoute("/api/admin/gateway")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async ({ request }) => {
        const auth = await authorizeAdmin(request);
        if (!auth.ok) return json({ error: "Acesso não permitido." }, auth.status);
        const pool = getPoolAdmin();
        if (!pool) return json({ error: "Pool unavailable" }, 503);
        const [clients, settings, logs] = await Promise.all([
          pool
            .from("gateway_clients")
            .select(
              "id,name,client_key,status,allowed_models,rate_limit_rpm,quota_limit_requests,total_requests,total_input_tokens,total_output_tokens,last_used_at,notes,created_at",
            )
            .order("created_at", { ascending: false }),
          pool.from("gateway_settings").select("*").eq("id", 1).single(),
          pool
            .from("gateway_request_logs")
            .select(
              "id,client_name,endpoint,requested_model,resolved_model,status_code,latency_ms,input_tokens,output_tokens,error_message,created_at",
            )
            .order("created_at", { ascending: false })
            .limit(50),
        ]);
        if (clients.error || settings.error || logs.error)
          return json({ error: "Failed to load gateway data" }, 500);
        return json({
          addresses: {
            panelUrl: process.env["PARENT_PUBLIC_URL"]?.replace(/\/+$/, "") || null,
            apiBaseUrl: process.env["API_PUBLIC_URL"]
              ? `${process.env["API_PUBLIC_URL"].replace(/\/+$/, "")}/v1`
              : null,
          },
          clients: (clients.data ?? []).map(({ client_key, ...client }) => ({
            ...client,
            key_hint: clientKeyHint(client_key),
            legacy_key: !client_key.startsWith("gw_hash_v1:"),
          })),
          settings: settings.data,
          catalog: MODEL_CATALOG.map((model) => ({
            ...model,
            enabled: !(settings.data.disabled_models || []).includes(model.id),
            availability: "unverified",
          })),
          logs: logs.data ?? [],
        });
      },
      POST: async ({ request }) => {
        const auth = await authorizeAdmin(request, "write");
        if (!auth.ok) return json({ error: "Acesso não permitido." }, auth.status);
        const pool = getPoolAdmin();
        if (!pool) return json({ error: "Pool unavailable" }, 503);
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!body) return json({ error: "JSON inválido." }, 400);
        let validated: Record<string, unknown>;
        try {
          validated = clientPatch(body, true);
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Cliente inválido." }, 400);
        }
        const key = createClientKey();
        const row = { ...validated, client_key: storedClientKey(key), status: "active" };
        const { data, error } = await pool
          .from("gateway_clients")
          .insert(row)
          .select(
            "id,name,client_key,status,allowed_models,rate_limit_rpm,quota_limit_requests,created_at",
          )
          .single();
        if (error)
          return json(
            {
              error:
                error.code === "23505" ? "Client key already exists" : "Failed to create client",
            },
            400,
          );
        const { client_key, ...client } = data;
        await recordAdminAudit(auth.actorId, "client.create", client.id);
        return json(
          { client: { ...client, key_hint: clientKeyHint(client_key) }, api_key: key },
          201,
        );
      },
      PATCH: async ({ request }) => {
        const auth = await authorizeAdmin(request, "write");
        if (!auth.ok) return json({ error: "Acesso não permitido." }, auth.status);
        const pool = getPoolAdmin();
        if (!pool) return json({ error: "Pool unavailable" }, 503);
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!body) return json({ error: "Invalid body" }, 400);
        if (body["action"] === "settings") {
          let patch: Record<string, unknown>;
          try {
            patch = settingsPatch(body);
          } catch (error) {
            return json(
              { error: error instanceof Error ? error.message : "Configuração inválida." },
              400,
            );
          }
          const { error } = await pool.from("gateway_settings").update(patch).eq("id", 1);
          if (!error) await recordAdminAudit(auth.actorId, "settings.update", "gateway");
          return error ? json({ error: "Failed to update settings" }, 400) : json({ ok: true });
        }
        if (typeof body["id"] !== "string") return json({ error: "id is required" }, 400);
        if (body["action"] === "rotate-key") {
          const key = createClientKey();
          const { data, error } = await pool
            .from("gateway_clients")
            .update({ client_key: storedClientKey(key) })
            .eq("id", body["id"])
            .select("id")
            .single();
          if (error || !data) return json({ error: "Não foi possível rotacionar a chave." }, 400);
          await recordAdminAudit(auth.actorId, "client.key.rotate", data.id);
          return json({ api_key: key, key_hint: clientKeyHint(key), id: data.id });
        }
        let patch: Record<string, unknown>;
        try {
          patch = clientPatch(body);
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Cliente inválido." }, 400);
        }
        const { data, error } = await pool
          .from("gateway_clients")
          .update(patch)
          .eq("id", body["id"])
          .select("id")
          .maybeSingle();
        if (error) return json({ error: "Failed to update client" }, 400);
        if (!data) return json({ error: "Cliente não encontrado." }, 404);
        await recordAdminAudit(auth.actorId, "client.update", String(body["id"]));
        return json({ ok: true });
      },
    },
  },
});
