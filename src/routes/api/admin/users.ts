import { createFileRoute } from "@tanstack/react-router";
import { adminJson, authorizeAdmin } from "@/lib/admin-auth.server";
import {
  createAdminUser,
  listAdminUsers,
  listAdminAudit,
  updateAdminUser,
  type AdminRole,
} from "@/lib/admin-store.server";

async function handle(request: Request) {
  const auth = await authorizeAdmin(request, "security");
  if (!auth.ok) return adminJson({ error: "Acesso não permitido." }, auth.status);
  try {
    if (request.method === "GET")
      return adminJson({ users: await listAdminUsers(), audit: await listAdminAudit() });
    const raw = await request.text();
    if (raw.length > 8192) return adminJson({ error: "Payload too large" }, 413);
    const body = JSON.parse(raw);
    if (request.method === "POST") {
      if (
        typeof body?.username !== "string" ||
        typeof body.password !== "string" ||
        typeof body.role !== "string"
      )
        return adminJson({ error: "Dados de usuário inválidos." }, 400);
      return adminJson(
        {
          user: await createAdminUser(
            auth.actorId,
            body.username,
            body.password,
            body.role as AdminRole,
          ),
        },
        201,
      );
    }
    if (typeof body?.id !== "string") return adminJson({ error: "ID obrigatório." }, 400);
    return adminJson({
      user: await updateAdminUser(auth.actorId, body.id, {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.password !== undefined ? { password: body.password } : {}),
      }),
    });
  } catch {
    return adminJson(
      {
        error:
          "Não foi possível salvar. Confira os dados; preserve pelo menos um administrador ativo. Senha mínima: 14 caracteres.",
      },
      400,
    );
  }
}
export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
      PATCH: ({ request }) => handle(request),
    },
  },
});
