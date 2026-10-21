import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const PARENT_ORIGIN = "https://snuggle-buddy-app-74.lovable.app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gateway Key Pool — Central de Monitoramento" },
      {
        name: "description",
        content:
          "Painel de controle e monitoramento do Pool de Chaves (Load Balancer Round-Robin + Failover 429).",
      },
      { property: "og:title", content: "Gateway Key Pool — Central de Monitoramento" },
      {
        property: "og:description",
        content:
          "Painel de controle e monitoramento do Pool de Chaves (Load Balancer Round-Robin + Failover 429).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

interface WorkerItem {
  id: string;
  name: string;
  project_origin: string;
  masked_key: string;
  status: "active" | "exhausted" | "disabled";
  total_requests: number;
  last_used_at: string | null;
  last_error: string | null;
  exhausted_at: string | null;
}

function Index() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState({
    active: 0,
    exhausted: 0,
    totalRequests: 0,
  });
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [syncToken, setSyncToken] = useState("snuggle-pool-sync-v1");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function fetchPoolStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/public/v1/workers/register");
      const data = await res.json();
      setConfigured(Boolean(data?.configured));
      if (data?.metrics) setMetrics(data.metrics);
      if (Array.isArray(data?.workers)) setWorkers(data.workers);
    } catch {
      setFeedback("Falha ao consultar o status do pool.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate(id: string) {
    setFeedback(null);
    try {
      const res = await fetch("/api/public/v1/workers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate", id }),
      });
      if (res.ok) {
        await fetchPoolStatus();
      } else {
        setFeedback("Não foi possível reativar a chave.");
      }
    } catch {
      setFeedback("Erro de rede ao reativar chave.");
    }
  }

  async function handleManualRegister() {
    if (!newKey.trim()) return;
    setFeedback(null);
    try {
      const res = await fetch("/api/public/v1/workers/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-remix-sync-token": syncToken.trim(),
        },
        body: JSON.stringify({
          api_key: newKey.trim(),
          project_origin: newOrigin.trim() || window.location.origin,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey("");
        setNewOrigin("");
        setFeedback("Chave registrada no pool com sucesso!");
        await fetchPoolStatus();
      } else {
        setFeedback(data?.message ?? "Erro ao registrar chave.");
      }
    } catch {
      setFeedback("Erro de rede ao registrar chave.");
    }
  }

  useEffect(() => {
    fetchPoolStatus();
    const interval = setInterval(fetchPoolStatus, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              Central do Gateway Key Pool
            </h1>
            <p className="text-sm text-muted-foreground">
              Load Balancer Round-Robin + Failover Automático (429) no 2º Supabase isolado.
            </p>
          </div>
          <Button variant="outline" onClick={fetchPoolStatus} disabled={loading}>
            {loading ? "Atualizando…" : "Atualizar agora"}
          </Button>
        </header>

        {configured === false && (
          <Card className="border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            Configure a secret <code className="font-mono font-semibold">POOL_SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            (do projeto <code className="font-mono">qtsyuyuuzshnurdatzla</code>) nas configurações do projeto Pai para ativar o banco do pool.
          </Card>
        )}

        {/* Cards de Métricas */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Chaves Ativas no Pool
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{metrics.active}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Chaves Esgotadas (em repouso)
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{metrics.exhausted}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total de Requisições Processadas
            </p>
            <p className="mt-2 text-3xl font-bold">{metrics.totalRequests}</p>
          </Card>
        </section>

        {/* Tabela de Workers Conectados */}
        <Card className="overflow-hidden p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Workers Conectados</h2>
            <span className="text-xs text-muted-foreground">
              Atualização automática a cada 10s
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Worker</th>
                  <th className="py-2 pr-4">Origem do Remix</th>
                  <th className="py-2 pr-4">Chave Mascarada</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Requisições</th>
                  <th className="py-2 pr-4">Último Uso</th>
                  <th className="py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum worker conectado no pool ainda.
                    </td>
                  </tr>
                ) : (
                  workers.map((w) => (
                    <tr key={w.id}>
                      <td className="py-3 pr-4 font-medium">{w.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                        {w.project_origin}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">{w.masked_key}</td>
                      <td className="py-3 pr-4">
                        {w.status === "active" && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                            🟢 Ativa
                          </span>
                        )}
                        {w.status === "exhausted" && (
                          <span className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-600">
                            🔴 Esgotada
                          </span>
                        )}
                        {w.status === "disabled" && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            ⚪ Inativa
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono">{w.total_requests}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {w.last_used_at
                          ? new Date(w.last_used_at).toLocaleString()
                          : "Nunca usada"}
                      </td>
                      <td className="py-3 text-right">
                        {w.status !== "active" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleReactivate(w.id)}
                          >
                            Reativar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Adicionar Worker manualmente */}
        <Card className="space-y-3 p-5">
          <h2 className="text-base font-semibold">Registrar Chave Manualmente no Pool</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              type="password"
              placeholder="LOVABLE_API_KEY (lov_...)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            <Input
              placeholder="Origem (ex: https://remix-1.lovable.app)"
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value)}
            />
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="x-remix-sync-token"
                value={syncToken}
                onChange={(e) => setSyncToken(e.target.value)}
              />
              <Button onClick={handleManualRegister} disabled={!newKey.trim()}>
                Adicionar
              </Button>
            </div>
          </div>
          {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
        </Card>

        {/* Guia de Conexão do Claude Code */}
        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-semibold">Guia de Conexão do Claude Code</h2>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              1. Configurar variáveis de ambiente no terminal (apontando para a Central):
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
{`export ANTHROPIC_BASE_URL="${PARENT_ORIGIN}/api/public"
export ANTHROPIC_AUTH_TOKEN="<SEU_CLAUDE_CODE_GATEWAY_TOKEN>"
claude`}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              2. Teste rápido via cURL (Anthropic Messages API com Failover):
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
{`curl -X POST "${PARENT_ORIGIN}/api/public/v1/messages" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: <SEU_CLAUDE_CODE_GATEWAY_TOKEN>" \\
  -d '{"model":"claude-sonnet-4-latest","max_tokens":256,"messages":[{"role":"user","content":"Olá, central!"}]}'`}
            </pre>
          </div>
        </Card>
      </div>
    </main>
  );
}
