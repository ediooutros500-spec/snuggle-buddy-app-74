import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  Cable,
  CheckCircle2,
  ChevronDown,
  Copy,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Network,
  Plus,
  RefreshCw,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AdminTeam } from "@/components/admin-team";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Snuggle Gateway | Painel" }] }),
  component: Dashboard,
});
type Screen =
  | "Visão geral"
  | "Endpoints"
  | "Modelos"
  | "Rotas e fallback"
  | "Clientes e API keys"
  | "Limites e quotas"
  | "Workers"
  | "Sincronização de remixes"
  | "Uso e custos"
  | "Logs de requisições"
  | "Preferências"
  | "Segurança";
type Worker = {
  id: string;
  name: string;
  project_origin: string;
  status: string;
  requests_today?: number;
  daily_request_limit?: number | null;
  total_requests: number;
};
type Client = {
  id: string;
  name: string;
  status: string;
  key_hint: string;
  rate_limit_rpm: number;
};
type Log = {
  id: string;
  client_name: string | null;
  endpoint: string;
  resolved_model: string | null;
  status_code: number;
  latency_ms: number;
};
const models: [string, ...string[]] = [
  "google/gemini-3.6-flash",
  "openai/gpt-5.6-sol",
  "openai/gpt-5.5-pro",
  "openai/gpt-image-2.5-sunburst",
  "openai/text-embedding-3-small",
  "google/veo-3.1-fast",
];
const endpointRows: [string, string, string][] = [
  ["POST", "/v1/messages", "Anthropic Messages"],
  ["POST", "/v1/chat/completions", "OpenAI Chat"],
  ["POST", "/v1/images/generations", "Imagens"],
  ["POST", "/v1/embeddings", "Embeddings"],
  ["POST", "/v1/videos/generations", "Vídeos"],
  ["GET", "/v1/models", "Catálogo"],
];
const nav = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Gateway", icon: Network, children: ["Endpoints", "Modelos", "Rotas e fallback"] },
  { label: "Acesso", icon: LockKeyhole, children: ["Clientes e API keys", "Limites e quotas"] },
  { label: "Rede pai/filhos", icon: Server, children: ["Workers", "Sincronização de remixes"] },
  { label: "Observabilidade", icon: BarChart3, children: ["Uso e custos", "Logs de requisições"] },
  { label: "Configurações", icon: Settings2, children: ["Preferências", "Segurança"] },
] as { label: string; icon: LucideIcon; children?: Screen[] }[];

function Dashboard() {
  const [screen, setScreen] = useState<Screen>("Visão geral");
  const [open, setOpen] = useState(nav.map((x) => x.label));
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [oneTimeKey, setOneTimeKey] = useState("");
  const [message, setMessage] = useState("Entre com seu usuário e senha.");
  const [mobile, setMobile] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [origin, setOrigin] = useState("");
  const [clientName, setClientName] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [rpm, setRpm] = useState("120");
  const [defaultModel, setDefaultModel] = useState(models[0]);
  const headers = { "Content-Type": "application/json" };
  async function login(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await fetch("/api/admin/session", {
        method: "POST",
        headers,
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      setPassword("");
      if (!r.ok) throw new Error(data.error || "Não foi possível entrar.");
      setUser(data.user);
      setMessage("Sessão iniciada.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao entrar.");
    }
  }
  async function logout() {
    const r = await fetch("/api/admin/session", { method: "DELETE" });
    if (!r.ok) {
      setMessage("Não foi possível encerrar a sessão. Tente novamente.");
      return;
    }
    setUser(null);
    setClients([]);
    setWorkers([]);
    setLogs([]);
    setOneTimeKey("");
    setMessage("Sessão encerrada.");
  }
  async function refresh() {
    try {
      const [a, w] = await Promise.all([
        fetch("/api/admin/gateway", { headers }),
        fetch("/api/public/v1/workers/register", { headers }),
      ]);
      const ad = await a.json();
      const wd = await w.json();
      if (a.status === 401) {
        setUser(null);
        setOneTimeKey("");
      }
      if (!a.ok) throw new Error(ad.error || "Token inválido.");
      setClients(ad.clients || []);
      setApiBaseUrl(ad.addresses?.apiBaseUrl || null);
      setLogs(ad.logs || []);
      setWorkers(wd.workers || []);
      setMessage("Dados atualizados.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao carregar dados.");
    }
  }
  async function createClient() {
    if (!clientName.trim()) return;
    const r = await fetch("/api/admin/gateway", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: clientName.trim() }),
    });
    const data = await r.json();
    setMessage(
      r.ok
        ? "Cliente criado. Copie a chave agora; ela não será exibida novamente."
        : data.error || "Não foi possível criar o cliente.",
    );
    if (r.ok) setOneTimeKey(data.api_key || "");
    setClientName("");
    if (r.ok) refresh();
  }
  async function rotateClientKey(client: Client) {
    if (
      !window.confirm(`Substituir a chave de ${client.name}? A chave atual deixará de funcionar.`)
    )
      return;
    const r = await fetch("/api/admin/gateway", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id: client.id, action: "rotate-key" }),
    });
    const data = await r.json();
    if (r.ok) {
      await refresh();
      setOneTimeKey(data.api_key);
      setMessage("Chave substituída. Copie o novo valor agora.");
    } else setMessage(data.error || "Falha ao substituir a chave.");
  }
  async function toggleClient(c: Client) {
    const r = await fetch("/api/admin/gateway", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id: c.id, status: c.status === "active" ? "suspended" : "active" }),
    });
    setMessage(r.ok ? "Status atualizado." : "Falha ao atualizar.");
    if (r.ok) refresh();
  }
  async function save() {
    const r = await fetch("/api/admin/gateway", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        action: "settings",
        default_model: defaultModel,
        disabled_models: [],
        global_rate_limit_rpm: Number(rpm),
        cooldown_minutes: 15,
      }),
    });
    setMessage(r.ok ? "Configurações salvas." : "Falha ao salvar.");
  }
  async function dispatch() {
    if (!origin.trim()) {
      setMessage("Informe a URL do remix.");
      return;
    }
    const r = await fetch("/api/public/v1/workers/dispatch", {
      method: "POST",
      headers,
      body: JSON.stringify({ project_origin: origin.trim() }),
    });
    const d = await r.json();
    setMessage(d.ok ? "Sinal enviado ao remix." : d.error || "O remix não respondeu.");
  }
  const go = (value: string) => {
    setScreen(value as Screen);
    setMobile(false);
  };
  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
          void refresh();
        }
      })
      .catch(() => setMessage("Falha ao verificar a sessão."))
      .finally(() => setCheckingSession(false));
  }, []);
  if (checkingSession)
    return <div className="grid min-h-screen place-items-center">Verificando sessão…</div>;
  if (!user)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8fa] p-5">
        <Card className="w-full max-w-md space-y-5 p-8">
          <h1 className="text-2xl font-bold">Entrar no Gateway</h1>
          <p className="text-sm text-slate-600">
            Use sua conta administrativa. As chaves dos aplicativos são criadas após o login.
          </p>
          <form onSubmit={login} className="space-y-4">
            <label className="block">
              Usuário
              <Input
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="block">
              Senha
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
          <p role="status" className="text-sm">
            {message}
          </p>
        </Card>
      </div>
    );
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#1b1f27]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r bg-white p-5 transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-8 flex items-center justify-between">
          <button onClick={() => go("Visão geral")} className="flex items-center gap-3 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7257ff] font-black text-white">
              S
            </span>
            <span>
              <b className="block text-lg">snuggle</b>
              <small className="uppercase tracking-widest text-[#8b91a0]">gateway cloud</small>
            </span>
          </button>
          <button className="lg:hidden" onClick={() => setMobile(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="mb-6 rounded-xl bg-[#f7f8fa] p-3">
          <b className="text-sm">{user.username}</b>
          <div className="text-xs text-[#8b91a0]">
            {user.role === "admin"
              ? "Administrador"
              : user.role === "operator"
                ? "Operador"
                : "Somente leitura"}
          </div>
        </div>
        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#a0a5b0]">
          Navegação
        </div>
        {nav.map((item) => (
          <div key={item.label}>
            <button
              onClick={() =>
                item.children
                  ? setOpen((v) =>
                      v.includes(item.label)
                        ? v.filter((x) => x !== item.label)
                        : [...v, item.label],
                    )
                  : go(item.label)
              }
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm ${screen === item.label ? "bg-[#eeeaff] text-[#6046ed]" : "text-[#626977]"}`}
            >
              <item.icon size={18} />
              {item.label}
              {item.children && (
                <ChevronDown
                  size={15}
                  className={`ml-auto ${open.includes(item.label) ? "rotate-180" : ""}`}
                />
              )}
            </button>
            {item.children && open.includes(item.label) && (
              <div className="ml-8 border-l pl-2">
                {item.children.map((child) => (
                  <button
                    key={child}
                    onClick={() => go(child)}
                    className={`block w-full rounded-lg p-2 text-left text-xs ${screen === child ? "bg-[#f0edff] font-semibold text-[#6046ed]" : "text-[#8b91a0]"}`}
                  >
                    {child}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="absolute bottom-5 left-5 right-5 rounded-xl bg-[#f7f5ff] p-3 text-xs text-[#6046ed]">
          <CheckCircle2 size={14} className="mr-2 inline" />
          Painel administrativo
        </div>
      </aside>
      {mobile && (
        <button
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setMobile(false)}
          aria-label="Fechar menu"
        />
      )}
      <main className="lg:ml-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white px-5 sm:px-8">
          <button className="lg:hidden" onClick={() => setMobile(true)}>
            <Menu size={20} />
          </button>
          <span className="hidden text-sm text-[#8b91a0] sm:block">
            <Gauge size={16} className="mr-2 inline" />
            Painel de controle
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={logout}>
              Sair
            </Button>
            <Button className="h-9 bg-[#7257ff]" onClick={refresh}>
              <RefreshCw size={15} />
            </Button>
          </div>
        </header>
        <section className="mx-auto max-w-[1500px] p-5 sm:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7257ff]">
                {screen}
              </div>
              <h1 className="text-3xl font-bold">
                {screen === "Visão geral" ? "Bom dia, Edio" : screen}
              </h1>
              <p className="mt-2 text-[#8b91a0]">
                Controle sua infraestrutura de IA em um único lugar.
              </p>
            </div>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw size={15} className="mr-2" />
              Atualizar dados
            </Button>
          </div>
          <div className="mb-5 rounded-xl bg-[#f5f2ff] p-3 text-sm text-[#6046ed]">{message}</div>
          {oneTimeKey && (
            <Card className="mb-5 space-y-3 border-amber-300 p-5">
              <b>Copie esta chave agora. Ela será exibida apenas uma vez.</b>
              <code className="block break-all text-sm">{oneTimeKey}</code>
              <Button onClick={() => navigator.clipboard?.writeText(oneTimeKey)}>
                Copiar chave
              </Button>
              <Button variant="outline" className="ml-2" onClick={() => setOneTimeKey("")}>
                Já salvei, ocultar
              </Button>
            </Card>
          )}
          <ScreenContent
            screen={screen}
            workers={workers}
            clients={clients}
            logs={logs}
            origin={origin}
            setOrigin={setOrigin}
            dispatch={dispatch}
            clientName={clientName}
            apiBaseUrl={apiBaseUrl}
            setClientName={setClientName}
            createClient={createClient}
            toggleClient={toggleClient}
            rotateClientKey={rotateClientKey}
            rpm={rpm}
            setRpm={setRpm}
            defaultModel={defaultModel}
            setDefaultModel={setDefaultModel}
            save={save}
          />
        </section>
      </main>
    </div>
  );
}
function ScreenContent({
  screen,
  workers,
  clients,
  logs,
  origin,
  setOrigin,
  dispatch,
  clientName,
  apiBaseUrl,
  setClientName,
  createClient,
  toggleClient,
  rotateClientKey,
  rpm,
  setRpm,
  defaultModel,
  setDefaultModel,
  save,
}: {
  screen: Screen;
  workers: Worker[];
  clients: Client[];
  logs: Log[];
  origin: string;
  setOrigin: (value: string) => void;
  dispatch: () => Promise<void>;
  clientName: string;
  apiBaseUrl: string | null;
  setClientName: (value: string) => void;
  createClient: () => Promise<void>;
  toggleClient: (client: Client) => Promise<void>;
  rotateClientKey: (client: Client) => Promise<void>;
  rpm: string;
  setRpm: (value: string) => void;
  defaultModel: string;
  setDefaultModel: (value: string) => void;
  save: () => Promise<void>;
}) {
  const card = "border-[#e7e9ee] bg-white shadow-sm";
  const Table = <T extends { id: string }>({
    rows,
    heads,
    render,
  }: {
    rows: T[];
    heads: string[];
    render: (row: T) => ReactNode;
  }) => (
    <Card className={`${card} overflow-auto`}>
      <table className="w-full min-w-[680px] text-sm">
        <thead className="border-b bg-[#fafbfc]">
          <tr>
            {heads.map((h: string) => (
              <th key={h} className="p-4 text-left text-xs text-[#8b91a0]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row: T) => (
              <tr key={row.id} className="border-b last:border-0">
                {render(row)}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={heads.length} className="p-12 text-center text-[#a0a5b0]">
                Nenhum registro encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
  if (screen === "Endpoints")
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={`${card} p-5 md:col-span-2`}>
          <h3 className="font-semibold">Endereço da API</h3>
          <code className="mt-2 block break-all text-sm">
            {apiBaseUrl || "Endereço público da API ainda não configurado."}
          </code>
          <p className="mt-3 text-sm text-[#8b91a0]">
            Use este endereço com a chave criada em Clientes e API keys. A chave administrativa fica
            somente no painel.
          </p>
        </Card>
        {endpointRows.map(([method, path, name]) => (
          <Card key={path} className={`${card} p-5`}>
            <span className="text-xs font-bold text-[#28a879]">{method}</span>
            <h3 className="mt-4 font-semibold">{name}</h3>
            <code className="mt-2 block break-all text-xs text-[#8b91a0]">
              {apiBaseUrl ? `${apiBaseUrl}${path.slice(3)}` : path}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={!apiBaseUrl}
              onClick={() =>
                apiBaseUrl && navigator.clipboard?.writeText(`${apiBaseUrl}${path.slice(3)}`)
              }
            >
              <Copy size={14} className="mr-2" />
              Copiar endpoint
            </Button>
          </Card>
        ))}
      </div>
    );
  if (screen === "Modelos")
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {models.map((model) => (
          <Card key={model} className={`${card} p-5`}>
            <Zap size={18} className="text-[#7257ff]" />
            <div className="mt-4 break-all font-mono text-xs">{model}</div>
            <div className="mt-4 text-xs font-semibold text-[#28a879]">Ativo</div>
          </Card>
        ))}
      </div>
    );
  if (screen === "Clientes e API keys")
    return (
      <div className="space-y-5">
        <Card className={`${card} flex gap-2 p-5`}>
          <Input
            placeholder="Nome do cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <Button className="bg-[#7257ff]" onClick={createClient}>
            <Plus size={15} className="mr-2" />
            Criar
          </Button>
        </Card>
        <Table
          rows={clients}
          heads={["Cliente", "API key", "RPM", "Status", "Ação"]}
          render={(c: Client) => (
            <>
              <td className="p-4 font-medium">{c.name}</td>
              <td className="p-4 font-mono text-xs">{c.key_hint}</td>
              <td className="p-4">{c.rate_limit_rpm}</td>
              <td className="p-4 text-[#28a879]">{c.status === "active" ? "Ativo" : "Suspenso"}</td>
              <td className="p-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="mr-2"
                  onClick={() => rotateClientKey(c)}
                >
                  Substituir chave
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleClient(c)}>
                  {c.status === "active" ? "Suspender" : "Ativar"}
                </Button>
              </td>
            </>
          )}
        />
      </div>
    );
  if (screen === "Workers" || screen === "Sincronização de remixes")
    return (
      <div className="space-y-5">
        <Card className={`${card} p-6`}>
          <h2 className="font-bold">Sincronizar remix</h2>
          <p className="mt-1 text-sm text-[#8b91a0]">
            Force um filho publicado a reenviar sua key ao pai.
          </p>
          <div className="mt-5 flex gap-2">
            <Input
              placeholder="https://filho.lovable.app"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <Button className="bg-[#7257ff]" onClick={dispatch}>
              Enviar sinal
            </Button>
          </div>
        </Card>
        <Table
          rows={workers}
          heads={["Worker", "Origem", "Status", "Hoje", "Total"]}
          render={(w: Worker) => (
            <>
              <td className="p-4 font-medium">{w.name}</td>
              <td className="p-4 text-xs">{w.project_origin}</td>
              <td className="p-4 text-[#28a879]">{w.status}</td>
              <td className="p-4">
                {w.requests_today ?? 0} / {w.daily_request_limit ?? "∞"}
              </td>
              <td className="p-4">{w.total_requests}</td>
            </>
          )}
        />
      </div>
    );
  if (screen === "Logs de requisições")
    return (
      <Table
        rows={logs}
        heads={["Cliente", "Endpoint", "Modelo", "Status", "Latência"]}
        render={(l: Log) => (
          <>
            <td className="p-4">{l.client_name || "Admin"}</td>
            <td className="p-4 font-mono text-xs">{l.endpoint}</td>
            <td className="p-4 text-xs">{l.resolved_model || "padrão"}</td>
            <td className={`p-4 ${l.status_code < 400 ? "text-[#28a879]" : "text-red-500"}`}>
              {l.status_code}
            </td>
            <td className="p-4">{l.latency_ms}ms</td>
          </>
        )}
      />
    );
  if (["Limites e quotas", "Preferências", "Rotas e fallback"].includes(screen))
    return (
      <Card className={`${card} max-w-xl space-y-5 p-6`}>
        <h2 className="font-bold">Configuração do gateway</h2>
        <label className="block text-sm">
          Requisições por minuto
          <Input
            className="mt-2"
            type="number"
            value={rpm}
            onChange={(e) => setRpm(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Modelo padrão
          <select
            className="mt-2 w-full rounded-md border p-2"
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
          >
            {models.map((model) => (
              <option key={model}>{model}</option>
            ))}
          </select>
        </label>
        <Button className="bg-[#7257ff]" onClick={save}>
          <Save size={15} className="mr-2" />
          Salvar
        </Button>
      </Card>
    );
  if (screen === "Segurança") return <AdminTeam />;
  const stats: [string, number, LucideIcon][] = [
    [
      "Requisições roteadas",
      workers.reduce((sum: number, worker: Worker) => sum + worker.total_requests, 0),
      Gauge,
    ],
    [
      "Workers ativos",
      workers.filter((worker: Worker) => worker.status === "active").length,
      Server,
    ],
    ["Clientes ativos", clients.filter((client) => client.status === "active").length, Users],
    ["Modelos", models.length, Boxes],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(([name, value, Icon]) => (
        <Card key={name} className={`${card} p-6`}>
          <Icon className="text-[#7257ff]" />
          <div className="mt-5 text-3xl font-bold">{value}</div>
          <div className="mt-1 text-sm text-[#8b91a0]">{name}</div>
        </Card>
      ))}
    </div>
  );
}
