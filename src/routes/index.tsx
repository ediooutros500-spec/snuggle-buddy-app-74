import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gateway Admin Console" },
      { name: "description", content: "Gestão de clientes, modelos, limites e observabilidade do gateway." },
    ],
  }),
  component: Admin,
});

type Client = {
  id: string;
  name: string;
  client_key: string;
  status: string;
  allowed_models: string[] | null;
  rate_limit_rpm: number;
  quota_limit_requests: number | null;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  last_used_at: string | null;
};

type Log = {
  id: string;
  client_name: string | null;
  endpoint: string;
  requested_model: string | null;
  resolved_model: string | null;
  status_code: number;
  latency_ms: number;
  created_at: string;
};

const models = ["google/gemini-3.6-flash", "google/gemini-2.5-pro", "openai/gpt-5.6-sol", "openai/gpt-5.5-pro"];

function Admin() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<{ clients: Client[]; settings: any; logs: Log[] }>({ clients: [], settings: {}, logs: [] });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function load() {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/gateway", { headers: auth });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar");
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!name.trim()) return;
    const r = await fetch("/api/admin/gateway", { method: "POST", headers: auth, body: JSON.stringify({ name }) });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setName("");
    await load();
  }

  async function updateClient(id: string, status: string) {
    await fetch("/api/admin/gateway", { method: "PATCH", headers: auth, body: JSON.stringify({ id, status }) });
    await load();
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  const totals = useMemo(
    () =>
      data.clients.reduce(
        (a, c) => ({
          requests: a.requests + (c.total_requests || 0),
          inTok: a.inTok + (c.total_input_tokens || 0),
          outTok: a.outTok + (c.total_output_tokens || 0),
        }),
        { requests: 0, inTok: 0, outTok: 0 }
      ),
    [data.clients]
  );

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gateway Control Plane</h1>
          <p className="text-muted-foreground">Admin Console: Gestão de clientes, quotas e observabilidade</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="CLAUDE_CODE_GATEWAY_TOKEN" value={token} onChange={(e) => setToken(e.target.value)} type="password" />
          <Button onClick={load} disabled={busy}>{busy ? "..." : "Atualizar"}</Button>
        </div>
      </div>

      {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-sm text-muted-foreground">Total Requests</div><div className="text-2xl font-bold">{totals.requests.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground">Input Tokens</div><div className="text-2xl font-bold">{totals.inTok.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground">Output Tokens</div><div className="text-2xl font-bold">{totals.outTok.toLocaleString()}</div></Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Clientes & Chaves</h2>
          <div className="flex gap-2">
            <Input placeholder="Nome do cliente" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={create}>Criar Cliente</Button>
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left border-b">
                <th className="p-3">Nome</th>
                <th className="p-3">Client Key</th>
                <th className="p-3">Status</th>
                <th className="p-3">RPM</th>
                <th className="p-3">Requests</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.clients.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 font-mono text-xs">{c.client_key}</td>
                  <td className="p-3">{c.status}</td>
                  <td className="p-3">{c.rate_limit_rpm}</td>
                  <td className="p-3">{c.total_requests || 0}</td>
                  <td className="p-3">
                    <Button variant="outline" size="sm" onClick={() => updateClient(c.id, c.status === "active" ? "suspended" : "active")}>
                      {c.status === "active" ? "Suspender" : "Ativar"}
                    </Button>
                  </td>
                </tr>
              ))}
              {!data.clients.length && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhum cliente cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Logs Recentes (Telemetria)</h2>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left border-b">
                <th className="p-3">Cliente</th>
                <th className="p-3">Endpoint</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Status</th>
                <th className="p-3">Latência</th>
                <th className="p-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="p-3">{l.client_name || "Admin"}</td>
                  <td className="p-3 font-mono text-xs">{l.endpoint}</td>
                  <td className="p-3">{l.resolved_model || l.requested_model || "-"}</td>
                  <td className="p-3">{l.status_code}</td>
                  <td className="p-3">{l.latency_ms}ms</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
              {!data.logs.length && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhum log registrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}