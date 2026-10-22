import { createFileRoute } from "@tanstack/react-router";
import { maybeAutoRegisterChild } from "@/lib/key-pool.server";
import { CORS_HEADERS } from "@/lib/claude-compat.server";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });

export const Route = createFileRoute("/api/public/v1/workers/announce")({ server: { handlers: {
  OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
  POST: async ({ request }) => {
    // This is intentionally local-only: the child never receives the parent's secret.
    if (request.headers.get("x-child-auto-dispatch") !== "1") return json({ error: "Unauthorized" }, 401);
    await maybeAutoRegisterChild(request.url);
    const configured = Boolean(process.env["LOVABLE_API_KEY"] && process.env["REMIX_SYNC_SECRET"]);
    return json({ ok: true, registered: configured, message: configured ? "Sincronização do filho disparada." : "Configure LOVABLE_API_KEY e REMIX_SYNC_SECRET neste remix para registrar no pai." });
  },
} } });
