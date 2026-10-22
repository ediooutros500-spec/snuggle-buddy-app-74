import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type User = {
  id: string;
  username: string;
  role: "admin" | "operator" | "viewer";
  enabled: boolean;
};
type Audit = { id: string; at: string; actorId: string; action: string; resourceId: string };
export function AdminTeam() {
  const [users, setUsers] = useState<User[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [message, setMessage] = useState("Carregando equipe e auditoria…");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("viewer");
  const [target, setTarget] = useState("");
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/users");
      const data = await r.json();
      if (!r.ok)
        throw new Error(
          r.status === 403
            ? "Somente administradores gerenciam usuários e consultam esta auditoria."
            : data.error,
        );
      setUsers(data.users);
      setAudit(data.audit);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar equipe.");
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function mutate(method: string, body: unknown) {
    try {
      const r = await fetch("/api/admin/users", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Falha na operação.");
      setPassword("");
      setUsername("");
      setTarget("");
      await refresh();
      setMessage("Usuário atualizado. Mudanças de acesso encerram as sessões anteriores.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha na operação.");
    }
  }
  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Equipe e acesso</h2>
        <p className="text-sm text-slate-600">
          Administrador: equipe e configuração. Operador: clientes e operação. Leitura: consultas.
          Sessões expiram após 30 minutos sem uso ou 8 horas no total. MFA ainda pendente.
        </p>
        <p role="status" className="text-sm">
          {message}
        </p>
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(
              target ? "PATCH" : "POST",
              target ? { id: target, password } : { username, password, role },
            );
          }}
        >
          <label>
            Usuário
            <Input
              autoComplete="off"
              value={username}
              required={!target}
              disabled={Boolean(target)}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Senha (mínimo 14 caracteres)
            <Input
              type="password"
              autoComplete="new-password"
              minLength={14}
              maxLength={256}
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Perfil
            <select
              className="mt-1 w-full rounded border p-2"
              value={role}
              disabled={Boolean(target)}
              onChange={(e) => setRole(e.target.value as User["role"])}
            >
              <option value="viewer">Leitura</option>
              <option value="operator">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit">{target ? "Salvar senha" : "Criar usuário"}</Button>
            {target && (
              <Button
                variant="outline"
                onClick={() => {
                  setTarget("");
                  setUsername("");
                  setPassword("");
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-3">{user.username}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => void mutate("PATCH", { id: user.id, role: e.target.value })}
                    >
                      <option value="viewer">Leitura</option>
                      <option value="operator">Operador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td>{user.enabled ? "Ativo" : "Desativado"}</td>
                  <td className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTarget(user.id);
                        setUsername(user.username);
                        setPassword("");
                      }}
                    >
                      Trocar senha
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void mutate("PATCH", { id: user.id, enabled: !user.enabled })}
                    >
                      {user.enabled ? "Desativar" : "Ativar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Últimas 100 ações administrativas</h2>
        <p className="mb-3 text-sm text-slate-600">
          Senhas e chaves não são registradas. Histórico local limitado a 10.000 eventos; backup
          externo e exportação ainda pendentes.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th>Data</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Recurso</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((event) => (
                <tr key={event.id} className="border-t">
                  <td className="p-2">{new Date(event.at).toLocaleString("pt-BR")}</td>
                  <td>{users.find((u) => u.id === event.actorId)?.username || event.actorId}</td>
                  <td>{event.action}</td>
                  <td>{event.resourceId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
