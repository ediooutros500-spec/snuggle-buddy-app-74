import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, isAuthorized } from "@/lib/claude-compat.server";
import { isAllowedChildOrigin } from "@/lib/child-config.server";
import { authorizeAdmin } from "@/lib/admin-auth.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

function originOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (!isAllowedChildOrigin(url.origin)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/v1/workers/dispatch")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const auth = await authorizeAdmin(request, "write");
        if (!auth.ok) return json({ error: "Acesso não permitido." }, auth.status);
        const body = (await request.json().catch(() => null)) as {
          project_origin?: unknown;
        } | null;
        const origin = originOf(body?.project_origin);
        if (!origin)
          return json(
            { error: "project_origin must be an allowed .lovable.app HTTPS origin" },
            400,
          );
        try {
          const response = await fetch(`${origin}/api/public/v1/workers/announce`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-parent-dispatch": "snuggle-buddy-app-74",
              "x-child-auto-dispatch": "1",
            },
            redirect: "error",
            signal: AbortSignal.timeout(8_000),
          });
          const result = await response.json().catch(() => ({}));
          return json(
            { ok: response.ok, project_origin: origin, child_status: response.status, result },
            response.ok ? 200 : 502,
          );
        } catch {
          return json({ ok: false, project_origin: origin, error: "Child did not respond" }, 504);
        }
      },
    },
  },
});
