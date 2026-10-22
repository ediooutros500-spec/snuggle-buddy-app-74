import { createFileRoute } from "@tanstack/react-router";
import { adminIdentity, adminJson, sameAdminOrigin } from "@/lib/admin-auth.server";
import { findAdminUser, updateAdminUser, verifyAdminPassword } from "@/lib/admin-store.server";
export const Route = createFileRoute("/api/admin/password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!sameAdminOrigin(request)) return adminJson({ error: "Origem não permitida." }, 403);
        const identity = await adminIdentity(request);
        if (!identity) return adminJson({ error: "Sessão inválida." }, 401);
        const raw = await request.text();
        if (raw.length > 4096) return adminJson({ error: "Dados muito grandes." }, 413);
        try {
          const body = JSON.parse(raw);
          if (
            typeof body.currentPassword !== "string" ||
            typeof body.newPassword !== "string" ||
            body.newPassword.length < 14 ||
            body.newPassword.length > 256
          )
            return adminJson(
              { error: "Informe a senha atual e uma nova senha com pelo menos 14 caracteres." },
              400,
            );
          const user = await findAdminUser(identity.username);
          if (!user || !(await verifyAdminPassword(body.currentPassword, user.passwordHash)))
            return adminJson({ error: "Senha atual incorreta." }, 400);
          await updateAdminUser(identity.id, identity.id, { password: body.newPassword });
          return adminJson({ ok: true, reauthenticate: true });
        } catch {
          return adminJson({ error: "Não foi possível alterar a senha." }, 400);
        }
      },
    },
  },
});
