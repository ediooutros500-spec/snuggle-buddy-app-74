import { createFileRoute } from "@tanstack/react-router";
import { authorizeAdmin, adminJson } from "@/lib/admin-auth.server";
import { authenticateGatewayRequest } from "@/lib/claude-compat.server";
import { MODEL_CATALOG } from "@/lib/gateway-policy.server";
export const Route = createFileRoute("/api/admin/playground")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await authorizeAdmin(request, "write");
        if (!admin.ok) return adminJson({ error: "Acesso não permitido." }, admin.status);
        const raw = await request.text();
        if (raw.length > 16384) return adminJson({ error: "Dados muito grandes." }, 413);
        try {
          const body = JSON.parse(raw);
          if (
            typeof body.api_key !== "string" ||
            typeof body.client_id !== "string" ||
            typeof body.prompt !== "string" ||
            !body.prompt.trim() ||
            body.prompt.length > 8000 ||
            !MODEL_CATALOG.some((m) => m.id === body.model && m.kind === "text")
          )
            return adminJson({ error: "Selecione cliente, modelo e mensagem válidos." }, 400);
          const headers = new Headers({
            authorization: `Bearer ${body.api_key}`,
            "content-type": "application/json",
          });
          if (typeof body.device_id === "string" && body.device_id)
            headers.set("x-device-id", body.device_id);
          // This check only validates identity, without registering another device access.
          const auth = await authenticateGatewayRequest(
            new Request(request.url, { headers }),
            false,
          );
          if (!auth.authorized || auth.client?.id !== body.client_id)
            return adminJson(
              {
                error:
                  "A chave não corresponde ao cliente selecionado, está expirada ou o dispositivo não está autorizado.",
              },
              403,
            );
          const base = process.env["API_PUBLIC_URL"]?.replace(/\/+$/, "");
          if (!base || new URL(base).protocol !== "https:")
            return adminJson({ error: "URL pública da API indisponível." }, 503);
          const start = Date.now();
          const response = await fetch(`${base}/v1/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: body.model,
              messages: [{ role: "user", content: body.prompt }],
              max_tokens: 256,
              stream: false,
            }),
            redirect: "manual",
            signal: AbortSignal.timeout(60000),
          });
          const result = await response.json().catch(() => ({ error: "Resposta sem JSON." }));
          return adminJson({ status: response.status, duration: Date.now() - start, body: result });
        } catch {
          return adminJson({ error: "Não foi possível concluir o teste." }, 503);
        }
      },
    },
  },
});
