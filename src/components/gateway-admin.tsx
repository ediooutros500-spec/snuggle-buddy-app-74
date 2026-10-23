import { McpCatalog } from "./mcp-catalog";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  KeyRound,
  Boxes,
  BarChart3,
  FlaskConical,
  Code2,
  Settings2,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  Copy,
  Search,
  Plus,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { MODEL_DISPLAY_NAMES } from "@/lib/model-names";
import { ADMIN_SECTIONS } from "./gateway-navigation";
import "./gateway-admin.css";

import type {
  ModelRow,
  ConnectionRow,
  ClientRow,
  RequestRow,
  UsageGroup,
  UsageData,
  PageData,
  SystemData,
} from "./gateway-admin-types";
type User = { username: string; role: "admin" | "operator" | "viewer" };
type System = SystemData;
const ICONS: Record<string, typeof Activity> = {
  overview: Activity,
  connections: KeyRound,
  clients: Boxes,
  models: Activity,
  usage: BarChart3,
  playground: FlaskConical,
  integration: Code2,
  mcp: Boxes,
  settings: Settings2,
};
const integer = (value: unknown) => Number(value || 0).toLocaleString("pt-BR");
const date = (value: unknown) =>
  value ? new Date(String(value)).toLocaleString("pt-BR") : "Nunca";
async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) window.dispatchEvent(new Event("gateway-session-expired"));
  if (!response.ok)
    throw new Error(data.error?.message || data.error || "Não foi possível concluir a operação.");
  return data;
}
function Button({
  children,
  secondary = false,
  danger = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean; danger?: boolean }) {
  return (
    <button
      {...props}
      className={`ag-button ${secondary ? "secondary" : ""} ${danger ? "danger" : ""} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}
function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ag-panel">
      <div className="ag-panel-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="ag-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`ag-badge ${tone}`}>{children}</span>;
}
function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="ag-empty">
      <div className="ag-empty-icon">
        <Boxes size={23} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function Stats({ items }: { items: { label: string; value: ReactNode; detail: string }[] }) {
  return (
    <div className="ag-stats">
      {items.map((item) => (
        <div className="ag-stat" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail}</small>
        </div>
      ))}
    </div>
  );
}
function Pager({
  page,
  total,
  limit = 25,
  onChange,
}: {
  page: number;
  total: number;
  limit?: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="ag-pager">
      <small>
        {integer(total)} registros · Página {page} de {Math.max(1, Math.ceil(total / limit))}
      </small>
      <div>
        <Button secondary disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </Button>
        <Button secondary disabled={page * limit >= total} onClick={() => onChange(page + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
function GridTable({ heads, children }: { heads: string[]; children: ReactNode }) {
  return (
    <div className="ag-table-wrap">
      <table className="ag-table">
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      secondary
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copied ? "Copiado" : label}
    </Button>
  );
}

export function GatewayAdmin({ section = "overview" }: { section?: string }) {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true),
    [system, setSystem] = useState<System | null>(null),
    [notice, setNotice] = useState(""),
    [mobile, setMobile] = useState(false),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false);
  const active = ADMIN_SECTIONS.find((s) => s.id === section) || ADMIN_SECTIONS[0]!;
  const loadSystem = useCallback(async () => {
    try {
      setSystem(await api("/api/admin/system"));
    } catch (e) {
      setNotice((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const expire = () => {
      setUser(null);
      setSystem(null);
      setNotice("Sua sessão terminou. Entre novamente.");
    };
    window.addEventListener("gateway-session-expired", expire);
    api("/api/admin/session")
      .then((data) => {
        if (data.authenticated) setUser(data.user);
      })
      .catch((e) => setNotice(e.message))
      .finally(() => setChecking(false));
    return () => window.removeEventListener("gateway-session-expired", expire);
  }, []);
  useEffect(() => {
    if (user) void loadSystem();
  }, [user, refresh, loadSystem]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const data = await api("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      setUser(data.user);
      setNotice("");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/api/admin/session", { method: "DELETE" });
      setUser(null);
      setSystem(null);
      setNotice("");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  const reload = () => setRefresh((n) => n + 1);
  if (checking)
    return (
      <div className="gateway-admin ag-login">
        <p>Verificando acesso…</p>
      </div>
    );
  if (!user)
    return (
      <div className="gateway-admin ag-login">
        <div className="ag-login-card">
          <div className="ag-logo">
            G<span>Gateway</span>
          </div>
          <Badge>Administração</Badge>
          <h1>
            Seu gateway,
            <br />
            sob controle.
          </h1>
          <p>Entre para administrar suas contas, clientes e consumo.</p>
          <form onSubmit={login}>
            <Field label="Usuário">
              <input name="username" autoComplete="username" required autoFocus />
            </Field>
            <Field label="Senha">
              <input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Button disabled={busy}>
              {busy ? "Entrando…" : "Entrar no painel"}
              <ArrowUpRight size={16} />
            </Button>
          </form>
          {notice && (
            <div role="alert" className="ag-alert error">
              {notice}
            </div>
          )}
          <small>Acesso administrativo.</small>
        </div>
      </div>
    );
  const write = user.role !== "viewer";
  return (
    <div className="gateway-admin">
      <aside className={`ag-sidebar ${mobile ? "open" : ""}`}>
        <a className="ag-logo" href="/admin/overview">
          G<span>Gateway</span>
        </a>
        <button
          className="ag-mobile-close"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>

        <nav>
          {["Operação", "Monitoramento", "Ferramentas", "Administração"].map((group) => (
            <div key={group}>
              <p className="ag-nav-group">{group}</p>
              {ADMIN_SECTIONS.map((item) => {
                const Icon = ICONS[item.id]!;
                return item.group === group ? (
                  <a
                    key={item.id}
                    href={`/admin/${item.id}`}
                    className={active.id === item.id ? "active" : ""}
                    aria-current={active.id === item.id ? "page" : undefined}
                  >
                    <Icon size={18} />
                    {item.label}
                  </a>
                ) : null;
              })}
            </div>
          ))}
        </nav>
        <div className="ag-sidebar-bottom">
          <div className="ag-avatar">{user.username.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.username}</strong>
            <small>
              {user.role === "admin" ? "Administrador" : write ? "Operador" : "Somente leitura"}
            </small>
          </div>
          <button aria-label="Sair" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button className="ag-overlay" aria-label="Fechar menu" onClick={() => setMobile(false)} />
      )}
      <main className="ag-main">
        <header className="ag-topbar">
          <button
            className="ag-mobile-toggle"
            aria-label="Abrir menu"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <div>
            <span>Administração</span>
            <b>/</b>
            {active.label}
          </div>
          <div>
            <Badge tone={system?.health["ready"] ? "success" : "warning"}>
              {system?.health["ready"] ? "Contas disponíveis" : "Aguardando conta"}
            </Badge>
            <Button
              secondary
              onClick={() => {
                reload();
                setNotice("");
              }}
            >
              <RefreshCw size={15} />
              Atualizar
            </Button>
          </div>
        </header>
        <div className="ag-content">
          <div className="ag-page-heading">
            <div>
              <h1>{active.label}</h1>
              <p>{active.description}</p>
            </div>
            {section === "overview" && (
              <a className="ag-link-button" href="/admin/connections">
                Gerenciar contas
                <ArrowUpRight size={15} />
              </a>
            )}
          </div>
          {notice && (
            <div role="status" className="ag-alert">
              {notice}
              <button aria-label="Ocultar aviso" onClick={() => setNotice("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {!system ? (
            <Panel title="Carregando instalação">
              <p>Aguarde os dados do gateway.</p>
            </Panel>
          ) : (
            <Page
              key={section}
              section={section}
              system={system}
              write={write}
              user={user}
              refresh={refresh}
              reload={reload}
              notify={setNotice}
            />
          )}
        </div>
      </main>
    </div>
  );
}
type PageProps = {
  section: string;
  system: System;
  write: boolean;
  user: User;
  refresh: number;
  reload: () => void;
  notify: (message: string) => void;
};
function Page(props: PageProps) {
  switch (props.section) {
    case "connections":
      return <Connections {...props} />;
    case "clients":
      return <Clients {...props} />;
    case "models":
      return <Requests {...props} />;
    case "usage":
      return <Usage {...props} />;
    case "playground":
      return <Playground {...props} />;
    case "mcp":
      return <McpCatalog />;
    case "integration":
      return <Integration {...props} />;
    case "settings":
      return (
        <div className="ag-stack">
          <Configuration {...props} />
          <GlobalModels {...props} />
          <PasswordForm notify={props.notify} />
        </div>
      );
    default:
      return <Overview {...props} />;
  }
}
function useResource<T>(path: string, refresh: number) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    api(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, refresh]);
  return { data, error };
}

const label = (id: string) => MODEL_DISPLAY_NAMES[id] || id;
const families = [
  { id: "anthropic", name: "Claude", icon: "anthropic" },
  { id: "openai", name: "OpenAI", icon: "openai" },
  { id: "google", name: "Google", icon: "googlegemini" },
];
function Brand({ family }: { family: string }) {
  const f = families.find((x) => x.id === family);
  return (
    <span className="ag-brand">
      <img src={`/brands/${f?.icon || "anthropic"}.svg`} width="20" height="20" alt="" />
      {f?.name || family}
    </span>
  );
}
function ModelPicker({
  catalog,
  defaults = [],
  name = "models",
}: {
  catalog: ModelRow[];
  defaults?: string[];
  name?: string;
}) {
  const [selected, setSelected] = useState(defaults),
    [family, setFamily] = useState("all"),
    [query, setQuery] = useState("");
  const shown = catalog.filter(
    (m) =>
      (family === "all" || m.id.startsWith(family + "/")) &&
      label(m.id).toLowerCase().includes(query.toLowerCase()),
  );
  const toggle = (id: string) =>
    setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  return (
    <div className="ag-model-picker">
      <div className="ag-actions">
        <Button
          type="button"
          secondary
          onClick={() => setSelected([])}
          aria-pressed={!selected.length}
        >
          Todos os liberados
        </Button>
        <span>
          {selected.length
            ? `${selected.length} selecionados`
            : "Todos os modelos liberados globalmente"}
        </span>
      </div>
      <div className="ag-tabs">
        <Button
          type="button"
          secondary
          onClick={() => setFamily("all")}
          aria-pressed={family === "all"}
        >
          Todas as famílias
        </Button>
        {families.map((f) => (
          <Button
            type="button"
            secondary
            key={f.id}
            onClick={() => setFamily(f.id)}
            aria-pressed={family === f.id}
          >
            <Brand family={f.id} />
          </Button>
        ))}
      </div>
      <input
        aria-label="Buscar modelos"
        placeholder="Buscar modelo…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="ag-model-grid">
        {shown.map((m) => (
          <label
            key={m.id}
            className={`ag-model-choice ${selected.includes(m.id) ? "selected" : ""}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() => toggle(m.id)}
            />
            <span>
              <strong>{label(m.id)}</strong>
              <small>
                {m.kind === "text"
                  ? "Texto"
                  : m.kind === "image"
                    ? "Imagem"
                    : m.kind === "video"
                      ? "Vídeo / multimodal"
                      : "Embeddings"}
                {!m.enabled ? " · bloqueado globalmente" : ""}
              </small>
            </span>
          </label>
        ))}
      </div>
      {selected.map((id) => (
        <input type="hidden" key={id} name={name} value={id} />
      ))}
    </div>
  );
}
function ModelSelect({
  catalog,
  value,
  onChange,
}: {
  catalog: ModelRow[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [family, setFamily] = useState(value.split("/")[0] || "anthropic");
  const rows = catalog.filter((m) => m.id.startsWith(family + "/"));
  return (
    <div className="ag-stack">
      <div className="ag-tabs">
        {families.map((f) => (
          <Button
            type="button"
            secondary
            key={f.id}
            aria-pressed={family === f.id}
            onClick={() => {
              setFamily(f.id);
              onChange(catalog.find((m) => m.id.startsWith(f.id + "/"))?.id || "");
            }}
          >
            <Brand family={f.id} />
          </Button>
        ))}
      </div>
      <select
        aria-label="Modelo"
        value={rows.some((m) => m.id === value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="" disabled>
          Selecione um modelo
        </option>
        {rows.map((m) => (
          <option value={m.id} key={m.id}>
            {label(m.id)}
          </option>
        ))}
      </select>
      {!rows.length && <small>Nenhum modelo permitido nesta família.</small>}
    </div>
  );
}
function Period({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="ag-tabs" aria-label="Período">
      {[1, 7, 15, 30, 90].map((d) => (
        <Button
          secondary
          key={d}
          aria-pressed={value === String(d)}
          onClick={() => onChange(String(d))}
        >
          {d === 1 ? "24 horas" : `${d} dias`}
        </Button>
      ))}
    </div>
  );
}
function UsageCharts({ data }: { data: UsageData | null }) {
  const rows = data && data.byDay.length > 1 ? data.byDay : data?.byHour || [],
    max = Math.max(1, ...rows.map((x) => x.requests));
  return (
    <div className="ag-two">
      <Panel title="Tráfego e respostas">
        <div
          className="ag-chart"
          role="img"
          aria-label="Requisições e erros registrados por período"
        >
          <svg viewBox="0 0 640 180" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#7157eb" stopOpacity=".3" />
                <stop offset="1" stopColor="#7157eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1="10" x2="630" y1={20 + i * 45} y2={20 + i * 45} stroke="#e7e9f0" />
            ))}
            {rows.length > 0 && (
              <>
                {rows.length > 1 && (
                  <polygon
                    fill="url(#trafficFill)"
                    points={`10,170 ${rows.map((d, i) => `${rows.length === 1 ? 320 : 10 + (i * 620) / (rows.length - 1)},${165 - (d.requests / max) * 145}`).join(" ")} 630,170`}
                  />
                )}
                {[false, true].map((err) => (
                  <polyline
                    key={String(err)}
                    fill="none"
                    stroke={err ? "#e65f70" : "#7157eb"}
                    strokeWidth="3"
                    points={rows
                      .map(
                        (d, i) =>
                          `${rows.length === 1 ? 320 : 10 + (i * 620) / (rows.length - 1)},${165 - ((err ? d.errors : d.requests) / max) * 145}`,
                      )
                      .join(" ")}
                  />
                ))}
                {rows.map((d, i) => (
                  <circle
                    key={d.name}
                    cx={rows.length === 1 ? 320 : 10 + (i * 620) / (rows.length - 1)}
                    cy={165 - (d.requests / max) * 145}
                    r="4"
                    fill="#7157eb"
                  >
                    <title>
                      {d.name}: {d.requests} requisições, {d.errors} erros
                    </title>
                  </circle>
                ))}
              </>
            )}
          </svg>
          <div className="ag-chart-legend">
            <span>● Requisições</span>
            <span>● Erros</span>
          </div>
        </div>
        {!rows.length && <p>Sem requisições no período.</p>}
        <div className="ag-chart-dates">
          <span>{rows[0]?.name}</span>
          <span>{rows.at(-1)?.name}</span>
        </div>
      </Panel>
      <Panel title="Modelos mais utilizados">
        <div className="ag-ranking">
          {data?.byModel.slice(0, 6).map((r) => (
            <div key={r.name}>
              <span>
                {label(r.name)}
                <b>{integer(r.requests)}</b>
              </span>
              <progress
                value={r.requests}
                max={Math.max(1, ...data.byModel.map((x) => x.requests))}
              />
            </div>
          ))}
        </div>
        {!data?.byModel.length && <p>Nenhum consumo registrado.</p>}
      </Panel>
    </div>
  );
}
function Overview({ system, refresh }: PageProps) {
  const [days, setDays] = useState("7");
  const { data, error } = useResource<UsageData>(`/api/admin/usage?days=${days}`, refresh);
  return (
    <div className="ag-stack">
      <Period value={days} onChange={setDays} />
      {error && <p className="ag-alert error">{error}</p>}
      <Stats
        items={[
          {
            label: "Contas disponíveis",
            value: integer(system.counts.availableCredentials),
            detail: `${system.counts.credentials} contas cadastradas`,
          },
          {
            label: "Clientes ativos",
            value: integer(system.counts.activeClients),
            detail: `${system.counts.clients} clientes cadastrados`,
          },
          {
            label: "Requisições",
            value: data ? integer(data.requests) : "—",
            detail: `${integer(data?.errors)} com erro`,
          },
          {
            label: "Tokens",
            value: data ? integer(data.inputTokens + data.outputTokens) : "—",
            detail: `${integer(data?.unknownUsage)} registros sem uso completo`,
          },
        ]}
      />
      {data?.sampled && (
        <div className="ag-alert warning">
          Amostra de {integer(data.requests)} de {integer(data.totalMatching)} registros; amplie a
          análise com os filtros.
        </div>
      )}
      <UsageCharts data={data} />
      <div className="ag-two">
        <Panel title="Desempenho">
          <Stats
            items={[
              {
                label: "Sucesso",
                value: data?.requests
                  ? `${((data.success / data.requests) * 100).toFixed(1)}%`
                  : "—",
                detail: "Respostas sem erro registrado",
              },
              {
                label: "Latência média",
                value:
                  data?.averageLatencyMs != null ? `${integer(data.averageLatencyMs)} ms` : "—",
                detail: "Chamadas com duração registrada",
              },
            ]}
          />
        </Panel>
        <Panel title="Clientes com maior atividade">
          <GridTable heads={["Cliente", "Chamadas", "Tokens"]}>
            {data?.byClient.slice(0, 5).map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{integer(r.requests)}</td>
                <td>{integer(r.inputTokens + r.outputTokens)}</td>
              </tr>
            ))}
          </GridTable>
        </Panel>
      </div>
    </div>
  );
}
function Connections({ write, refresh, reload, notify }: PageProps) {
  const { data, error } = useResource<{ rows: ConnectionRow[] }>("/api/admin/credentials", refresh),
    [pending, setPending] = useState("");
  async function change(row: ConnectionRow, method: string, patch: Record<string, unknown> = {}) {
    if (
      method === "DELETE" &&
      !window.confirm(
        `Excluir ${row.account_label}? Ela deixará de atender novas chamadas. Um projeto ativo poderá cadastrá-la novamente pelo gatilho.`,
      )
    )
      return;
    setPending(row.id);
    try {
      await api("/api/admin/credentials", {
        method,
        body: JSON.stringify({ id: row.id, ...patch }),
      });
      reload();
      notify(method === "DELETE" ? "Conta excluída." : "Conta atualizada.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setPending("");
    }
  }
  return (
    <Panel
      title="Contas"
      description="Gerencie a disponibilidade e os limites das contas recebidas automaticamente."
    >
      {error ? (
        <p className="ag-error">{error}</p>
      ) : data?.rows.length ? (
        <GridTable
          heads={["Conta", "Estado", "Requisições hoje", "Último uso", "Limite diário", "Ações"]}
        >
          {data.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.account_label}</strong>
                <small>{row.key_hint}</small>
              </td>
              <td>
                <Badge
                  tone={
                    row.status === "active"
                      ? "success"
                      : row.status === "exhausted"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {row.status === "active"
                    ? "Ativa"
                    : row.status === "exhausted"
                      ? "Em espera"
                      : "Desativada"}
                </Badge>
                {row.last_error && (
                  <details>
                    <summary>Ver erro</summary>
                    <small className="ag-error">{row.last_error}</small>
                  </details>
                )}
              </td>
              <td>
                {integer(
                  row.usage_date === new Date().toISOString().slice(0, 10) ? row.requests_today : 0,
                )}
                <small>{integer(row.total_requests)} seleções no total</small>
              </td>
              <td>{date(row.last_used_at)}</td>
              <td>
                <form
                  className="ag-inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = new FormData(e.currentTarget).get("limit");
                    void change(row, "PATCH", {
                      daily_request_limit: value === "" ? null : Number(value),
                    });
                  }}
                >
                  <input
                    aria-label={`Limite de ${row.account_label}`}
                    name="limit"
                    type="number"
                    min="0"
                    defaultValue={row.daily_request_limit ?? ""}
                    placeholder="Sem limite"
                    disabled={!write || pending === row.id}
                  />
                  <Button secondary disabled={!write || pending === row.id}>
                    Salvar
                  </Button>
                </form>
              </td>
              <td>
                <div className="ag-actions">
                  <Button
                    secondary
                    disabled={!write || pending === row.id}
                    onClick={() =>
                      change(row, "PATCH", {
                        status: row.status === "disabled" ? "active" : "disabled",
                      })
                    }
                  >
                    {row.status === "disabled" ? "Ativar" : "Desativar"}
                  </Button>
                  <Button
                    danger
                    disabled={!write || pending === row.id}
                    onClick={() => change(row, "DELETE")}
                  >
                    Excluir
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </GridTable>
      ) : (
        <Empty
          title="Nenhuma conta recebida"
          description="As contas aparecem aqui quando um projeto executa o cadastro automático."
        />
      )}
    </Panel>
  );
}

function Clients({ system, write, refresh, reload, notify }: PageProps) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [editing, setEditing] = useState<ClientRow | null>(null),
    [adding, setAdding] = useState(false),
    [key, setKey] = useState(""),
    [busy, setBusy] = useState(false);
  const { data, error } = useResource<PageData<ClientRow>>(
    `/api/admin/clients?page=${page}&q=${encodeURIComponent(q)}`,
    refresh,
  );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const body = {
      ...(editing ? { id: editing["id"] } : {}),
      name: form.get("name"),
      rate_limit_rpm: Number(form.get("rpm")),
      quota_limit_requests: form.get("quota") === "" ? null : Number(form.get("quota")),
      allowed_models: form.getAll("models").length ? form.getAll("models") : null,
      notes: form.get("notes"),
      device_limit: Number(form.get("device_limit")),
      ...(form.get("validity_days") === "-1"
        ? {}
        : { validity_days: Number(form.get("validity_days")) }),
    };
    try {
      const result = await api("/api/admin/gateway", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      if (result.api_key) setKey(result.api_key);
      setAdding(false);
      setEditing(null);
      reload();
      notify("Cliente salvo.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(row: ClientRow, rotate = false) {
    if (
      rotate &&
      !window.confirm(
        `Substituir a chave de ${row["name"]}? A anterior será invalidada imediatamente.`,
      )
    )
      return;
    try {
      const result = await api("/api/admin/gateway", {
        method: "PATCH",
        body: JSON.stringify(
          rotate
            ? { id: row["id"], action: "rotate-key" }
            : { id: row["id"], status: row["status"] === "active" ? "suspended" : "active" },
        ),
      });
      if (result.api_key) setKey(result.api_key);
      reload();
      notify(rotate ? "Chave substituída. Copie o novo valor." : "Acesso do cliente atualizado.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <div className="ag-stack">
      {key && (
        <Panel
          title="Copie a chave agora"
          description="O valor completo só é exibido nesta ocasião. Ele não será recuperável depois."
        >
          <div className="ag-secret">
            <code>{key}</code>
            <CopyButton value={key} />
            <Button secondary onClick={() => setKey("")}>
              Já salvei, ocultar
            </Button>
          </div>
        </Panel>
      )}
      <Panel
        title="Clientes da sua API"
        description="Uma chave por cliente, com permissões e quota independentes da credencial Lovable."
        action={
          <Button
            disabled={!write}
            onClick={() => {
              setAdding(!adding);
              setEditing(null);
            }}
          >
            <Plus size={15} />
            Novo cliente
          </Button>
        }
      >
        {(adding || editing) && (
          <form key={editing?.["id"] || "new"} className="ag-form-box" onSubmit={save}>
            <h3>{editing ? "Editar cliente" : "Novo cliente"}</h3>
            <div className="ag-form-grid">
              <Field label="Nome">
                <input
                  name="name"
                  maxLength={200}
                  required
                  defaultValue={editing?.["name"] || ""}
                />
              </Field>
              <Field label="RPM do cliente">
                <input
                  name="rpm"
                  type="number"
                  min={1}
                  max={10000}
                  required
                  defaultValue={editing?.["rate_limit_rpm"] || 60}
                />
              </Field>
              <Field label="Quota total" hint="Vazio = sem limite. Zero impede novas gerações.">
                <input
                  name="quota"
                  type="number"
                  min={0}
                  defaultValue={editing?.["quota_limit_requests"] ?? ""}
                />
              </Field>
              <Field label="Observações">
                <input name="notes" maxLength={2000} defaultValue={editing?.["notes"] || ""} />
              </Field>
            </div>
            <div className="ag-form-grid">
              <Field
                label="Validade do acesso"
                hint={
                  editing?.expires_at
                    ? "Expira em " + date(editing.expires_at)
                    : "Prazo contado a partir do salvamento"
                }
              >
                <select name="validity_days" defaultValue={editing ? "-1" : "30"}>
                  {editing && <option value="-1">Manter validade atual</option>}
                  {[1, 7, 15, 30].map((d) => (
                    <option value={d} key={d}>
                      {d} {d === 1 ? "dia" : "dias"}
                    </option>
                  ))}
                  <option value="0">Sem expiração</option>
                </select>
              </Field>
              <Field
                label="Limite de dispositivos"
                hint="Zero = sem trava. Ao ativar, o aplicativo deve enviar X-Device-ID estável por instalação."
              >
                <input
                  name="device_limit"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={editing?.device_limit || 0}
                />
              </Field>
            </div>
            <ModelPicker catalog={system.catalog} defaults={editing?.allowed_models || []} />
            <p className="ag-note">
              A quota conta tentativas admitidas, inclusive falhas posteriores ou ausência de chave
              disponível. Não representa cobrança do provedor.
            </p>
            <div className="ag-actions">
              <Button disabled={busy}>{busy ? "Salvando…" : "Salvar cliente"}</Button>
              <Button
                type="button"
                secondary
                onClick={() => {
                  setAdding(false);
                  setEditing(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
        <form
          className="ag-search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search);
            setPage(1);
          }}
        >
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente pelo nome"
          />
          <Button secondary>Buscar</Button>
        </form>
        {error ? (
          <p className="ag-error">{error}</p>
        ) : data?.["rows"].length ? (
          <>
            <GridTable
              heads={[
                "Cliente",
                "Chave",
                "Modelos",
                "Consumo / quota",
                "RPM",
                "Dispositivos",
                "Acesso",
                "Ações",
              ]}
            >
              {data["rows"].map((row: ClientRow) => (
                <tr key={row["id"]}>
                  <td>
                    <strong>{row["name"]}</strong>
                    <small>
                      {row["notes"] || date(row["created_at"])}
                      <br />
                      {row.expires_at ? "Expira: " + date(row.expires_at) : "Sem expiração"}
                    </small>
                  </td>
                  <td>
                    <code>{row["key_hint"]}</code>
                  </td>
                  <td>
                    {row["allowed_models"]?.length
                      ? `${row["allowed_models"].length} modelos`
                      : "Todos os liberados"}
                  </td>
                  <td>
                    {integer(row["total_requests"])} / {row["quota_limit_requests"] ?? "∞"}
                  </td>
                  <td>{integer(row["rate_limit_rpm"])}</td>
                  <td>
                    <details>
                      <summary>
                        {row.device_count || 0} identificados / {row.device_limit || "∞"}
                      </summary>
                      <small>{integer(row.unidentified_requests)} acessos sem ID</small>
                      {row.devices?.map((d) => (
                        <small key={d.name}>
                          {d.name} · {date(d.last_seen)} · {integer(d.requests)} acessos
                        </small>
                      ))}
                      <Button
                        secondary
                        disabled={!write}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "Liberar os dispositivos cadastrados? Novos dispositivos poderão ocupar as vagas.",
                            )
                          )
                            return;
                          try {
                            await api("/api/admin/gateway", {
                              method: "PATCH",
                              body: JSON.stringify({ id: row.id, action: "reset-devices" }),
                            });
                            reload();
                            notify("Dispositivos liberados.");
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        Liberar dispositivos
                      </Button>
                    </details>
                  </td>
                  <td>
                    <Badge tone={row["status"] === "active" ? "success" : "neutral"}>
                      {row.expires_at && Date.parse(row.expires_at) <= Date.now()
                        ? "Expirado"
                        : row["status"] === "active"
                          ? "Ativo"
                          : "Suspenso"}
                    </Badge>
                  </td>
                  <td>
                    <div className="ag-actions">
                      <Button
                        secondary
                        disabled={!write}
                        onClick={() => {
                          setEditing(row);
                          setAdding(false);
                        }}
                      >
                        Editar
                      </Button>
                      <Button secondary disabled={!write} onClick={() => action(row, true)}>
                        Trocar chave
                      </Button>
                      <Button secondary disabled={!write} onClick={() => action(row)}>
                        {row["status"] === "active" ? "Suspender" : "Ativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </GridTable>
            <Pager page={page} total={data["total"]} onChange={setPage} />
          </>
        ) : (
          <Empty
            title="Nenhum cliente encontrado"
            description="Crie um cliente para emitir a chave usada pelos seus aplicativos."
          />
        )}
      </Panel>
    </div>
  );
}

function GlobalModels({ system, write, reload, notify }: PageProps) {
  const [search, setSearch] = useState(""),
    [kind, setKind] = useState("all");
  async function toggle(model: ModelRow) {
    const disabled = system.catalog
      .filter((m) => !m["enabled"] && m["id"] !== model["id"])
      .map((m) => m["id"]);
    if (model["enabled"]) disabled.push(model["id"]);
    try {
      await api("/api/admin/gateway", {
        method: "PATCH",
        body: JSON.stringify({ action: "settings", disabled_models: disabled }),
      });
      reload();
      notify("Política global de modelos atualizada.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function defaultModel(id: string) {
    try {
      await api("/api/admin/gateway", {
        method: "PATCH",
        body: JSON.stringify({ action: "settings", default_model: id }),
      });
      reload();
      notify("Modelo padrão atualizado.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const rows = system.catalog.filter(
    (m) =>
      (kind === "all" || m["kind"] === kind) &&
      m["id"].toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="ag-stack">
      <div className="ag-alert">
        O catálogo define quais modelos o gateway permite. A disponibilidade no provedor só é
        confirmada por uma chamada real; não há saldo ou preço presumido aqui.
      </div>
      <Panel
        title="Permissões globais de modelos"
        description={`${system.catalog.length} modelos configurados · ${system.catalog.filter((m) => m["enabled"]).length} permitidos globalmente`}
      >
        <div className="ag-filters">
          <Field label="Buscar modelo">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou família"
            />
          </Field>
          <Field label="Modalidade">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">Todas</option>
              <option value="text">Texto</option>
              <option value="image">Imagem</option>
              <option value="embedding">Embeddings</option>
              <option value="video">Vídeo</option>
            </select>
          </Field>
        </div>
        <GridTable heads={["Modelo", "Modalidade", "Política global", "Disponibilidade", "Ações"]}>
          {rows.map((m) => (
            <tr key={m["id"]}>
              <td>
                <strong>{label(m.id)}</strong>
                {system.settings["default_model"] === m["id"] && (
                  <small className="ag-purple">Padrão de texto</small>
                )}
              </td>
              <td>
                {m["kind"] === "text"
                  ? "Texto"
                  : m["kind"] === "image"
                    ? "Imagem"
                    : m["kind"] === "video"
                      ? "Vídeo"
                      : "Embeddings"}
              </td>
              <td>
                <Badge tone={m["enabled"] ? "success" : "neutral"}>
                  {m["enabled"] ? "Permitido" : "Bloqueado"}
                </Badge>
              </td>
              <td>
                <span className="ag-muted">Não verificada</span>
              </td>
              <td>
                <div className="ag-actions">
                  <Button secondary disabled={!write} onClick={() => toggle(m)}>
                    {m["enabled"] ? "Bloquear" : "Permitir"}
                  </Button>
                  {m["kind"] === "text" &&
                    m["enabled"] &&
                    system.settings["default_model"] !== m["id"] && (
                      <Button secondary disabled={!write} onClick={() => defaultModel(m["id"])}>
                        Usar como padrão
                      </Button>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </GridTable>
      </Panel>
    </div>
  );
}

function Usage({ refresh, system }: PageProps) {
  const [days, setDays] = useState("7"),
    [model, setModel] = useState(""),
    [client, setClient] = useState("");
  const clients = useResource<{ clients: ClientRow[] }>("/api/admin/gateway", refresh);
  const { data, error } = useResource<UsageData>(
    `/api/admin/usage?days=${days}&resolved_model=${encodeURIComponent(model)}&client_id=${encodeURIComponent(client)}`,
    refresh,
  );
  return (
    <div className="ag-stack">
      <Period value={days} onChange={setDays} />
      <div className="ag-filters">
        <Field label="Modelo">
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="">Todos</option>
            {system.catalog.map((m) => (
              <option key={m.id} value={m.id}>
                {label(m.id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cliente">
          <select value={client} onChange={(e) => setClient(e.target.value)}>
            <option value="">Todos</option>
            {clients.data?.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {(error || clients.error) && <p className="ag-alert error">{error || clients.error}</p>}
      <Stats
        items={[
          {
            label: "Requisições",
            value: data ? integer(data.requests) : "—",
            detail: data?.sampled
              ? `Amostra de ${integer(data.totalMatching)} registros`
              : "Registros no período",
          },
          {
            label: "Taxa de sucesso",
            value: data?.requests ? `${((data.success / data.requests) * 100).toFixed(1)}%` : "—",
            detail: `${integer(data?.errors)} erros`,
          },
          { label: "Entrada", value: integer(data?.inputTokens), detail: "Tokens informados" },
          {
            label: "Saída",
            value: integer(data?.outputTokens),
            detail: `${integer(data?.unknownUsage)} registros com uso incompleto`,
          },
        ]}
      />
      <UsageCharts data={data} />
      {(
        [
          ["Consumo por modelo", "byModel"],
          ["Consumo por cliente", "byClient"],
        ] as const
      ).map(([title, key]) => (
        <Panel title={title} key={key}>
          <GridTable
            heads={[
              key === "byModel" ? "Modelo" : "Cliente",
              "Chamadas",
              "Sucesso",
              "Erros",
              "Entrada",
              "Saída",
              "Média de tokens / chamada",
              "Latência média",
              "Uso incompleto",
            ]}
          >
            {data?.[key].map((r) => (
              <tr key={r.name}>
                <td>
                  <strong>{key === "byModel" ? label(r.name) : r.name}</strong>
                </td>
                <td>{integer(r.requests)}</td>
                <td>{(((r.requests - r.errors) / r.requests) * 100).toFixed(1)}%</td>
                <td>{integer(r.errors)}</td>
                <td>{integer(r.inputTokens)}</td>
                <td>{integer(r.outputTokens)}</td>
                <td>
                  {r.unknownUsage === r.requests
                    ? "—"
                    : integer(Math.round(r.completeTokens / (r.requests - r.unknownUsage)))}
                </td>
                <td>
                  {r.measuredLatency
                    ? integer(Math.round(r.latencyMs / r.measuredLatency)) + " ms"
                    : "—"}
                </td>
                <td>{integer(r.unknownUsage)}</td>
              </tr>
            ))}
          </GridTable>
          {!data?.[key].length && <p>Sem registros para estes filtros.</p>}
        </Panel>
      ))}
      <p className="ag-note">
        Valores financeiros só estarão disponíveis com faturamento conciliado do provedor. Tokens
        desconhecidos não são tratados como zero de consumo.
      </p>
    </div>
  );
}

function Requests({ system, refresh, notify }: PageProps) {
  const [page, setPage] = useState(1),
    [days, setDays] = useState("7"),
    [status, setStatus] = useState("all"),
    [model, setModel] = useState(""),
    [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<RequestRow | null>(null);
  const params = new URLSearchParams({
    page: String(page),
    days,
    status,
    resolved_model: model,
    q,
  });
  const { data, error } = useResource<PageData<RequestRow>>(
    `/api/admin/requests?${params}`,
    refresh,
  );
  function change(set: (v: string) => void, v: string) {
    set(v);
    setPage(1);
  }
  async function exportCsv() {
    try {
      const response = await fetch(`/api/admin/requests?${params}&export=csv`);
      if (!response.ok) throw new Error("Não foi possível exportar.");
      const objectUrl = URL.createObjectURL(await response.blob()),
        a = document.createElement("a");
      a.href = objectUrl;
      a.download = "gateway-requisicoes.csv";
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <div className="ag-stack">
      <Panel
        title="Histórico de requisições"
        description="Filtre respostas, procure clientes e abra os detalhes de cada registro."
        action={
          <Button secondary onClick={exportCsv}>
            Exportar CSV
          </Button>
        }
      >
        <div className="ag-filters">
          <Field label="Período">
            <select value={days} onChange={(e) => change(setDays, e.target.value)}>
              {[1, 7, 30, 90].map((d) => (
                <option key={d} value={d}>
                  {d === 1 ? "24 horas" : `${d} dias`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Resultado">
            <select value={status} onChange={(e) => change(setStatus, e.target.value)}>
              <option value="all">Todos</option>
              <option value="success">HTTP abaixo de 400</option>
              <option value="error">HTTP 400 ou maior</option>
            </select>
          </Field>
          <Field label="Modelo">
            <select value={model} onChange={(e) => change(setModel, e.target.value)}>
              <option value="">Todos</option>
              {system.catalog.map((m) => (
                <option key={m["id"]} value={m.id}>
                  {label(m.id)}
                </option>
              ))}
            </select>
          </Field>
          <form
            className="ag-inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              change(setQ, search);
            }}
          >
            <Field label="Cliente">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nome"
              />
            </Field>
            <Button secondary>Buscar</Button>
          </form>
        </div>
        {error ? (
          <p className="ag-error">{error}</p>
        ) : data?.["rows"].length ? (
          <>
            <GridTable
              heads={[
                "Data",
                "Cliente",
                "Modelo / endpoint",
                "HTTP",
                "Duração",
                "Tokens",
                "Detalhes",
              ]}
            >
              {data["rows"].map((r: RequestRow) => (
                <tr key={r["id"]}>
                  <td>{date(r["created_at"])}</td>
                  <td>{r["client_name"] || "Manutenção"}</td>
                  <td>
                    <strong>{r.resolved_model ? label(r.resolved_model) : "Não resolvido"}</strong>
                    <small>{r["endpoint"]}</small>
                  </td>
                  <td>
                    <Badge
                      tone={r["status_code"] >= 400 || r["error_message"] ? "error" : "success"}
                    >
                      {r["status_code"]}
                    </Badge>
                  </td>
                  <td>{integer(r["latency_ms"])} ms</td>
                  <td>
                    {r["input_tokens"] == null || r["output_tokens"] == null
                      ? "Desconhecidos"
                      : `${integer(r["input_tokens"])} / ${integer(r["output_tokens"])}`}
                  </td>
                  <td>
                    <Button secondary onClick={() => setSelected(r)}>
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </GridTable>
            <Pager page={page} total={data["total"]} onChange={setPage} />
          </>
        ) : (
          <Empty
            title="Nenhuma requisição encontrada"
            description="Os resultados aparecerão conforme a API for utilizada. Verifique também o período e os filtros."
          />
        )}
      </Panel>
      {selected && (
        <Panel
          title="Detalhes da requisição"
          action={
            <Button secondary onClick={() => setSelected(null)}>
              Fechar
            </Button>
          }
        >
          <dl className="ag-details">
            {[
              ["ID", selected["request_id"] || selected["id"]],
              ["Cliente", selected["client_name"] || "Manutenção"],
              ["Modelo solicitado", selected["requested_model"] || "Padrão"],
              ["Modelo resolvido", selected["resolved_model"] || "Não resolvido"],
              ["HTTP", selected["status_code"]],
              ["Credencial", selected["worker_key_hint"] || "Não selecionada"],
              ["Erro", selected["error_message"] || "Nenhum erro registrado"],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}
    </div>
  );
}

function Playground({ system, notify, refresh, write }: PageProps) {
  const clients = useResource<{ clients: ClientRow[] }>("/api/admin/gateway", refresh),
    [client, setClient] = useState(""),
    [credential, setCredential] = useState(""),
    [device, setDevice] = useState(""),
    [model, setModel] = useState(""),
    [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{ status: number; duration: number; body: unknown } | null>(
      null,
    );
  const selected = clients.data?.clients.find((c) => c.id === client);
  const catalog = system.catalog.filter(
    (m) =>
      m.kind === "text" &&
      m.enabled &&
      (!selected?.allowed_models?.length || selected.allowed_models.includes(m.id)),
  );
  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const data = await api("/api/admin/playground", {
        method: "POST",
        body: JSON.stringify({
          client_id: client,
          api_key: credential,
          device_id: device,
          model,
          prompt,
        }),
      });
      setResult(data);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ag-two">
      <Panel
        title="Teste de acesso"
        description="Usa a chave, as permissões e a quota do cliente selecionado."
      >
        <form onSubmit={send} className="ag-stack">
          <Field label="Cliente">
            <select
              required
              value={client}
              onChange={(e) => {
                setClient(e.target.value);
                setCredential("");
                setModel("");
              }}
            >
              <option value="">Selecione um cliente</option>
              {clients.data?.clients
                .filter((c) => c.status === "active")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          {clients.error && <p className="ag-error">{clients.error}</p>}
          <Field
            label="Chave do cliente"
            hint="Cole a chave emitida para esse cliente. Ela não pode ser recuperada pelo painel."
          >
            <input
              required
              type="password"
              autoComplete="off"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
            />
          </Field>
          <Field
            label="ID do dispositivo"
            hint="Obrigatório para clientes com trava ativa. Use o mesmo identificador estável do aplicativo."
          >
            <input
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              minLength={8}
              maxLength={128}
              placeholder="meu-computador-01"
            />
          </Field>
          <ModelSelect key={client} catalog={catalog} value={model} onChange={setModel} />
          <Field label="Mensagem">
            <textarea
              rows={5}
              required
              maxLength={8000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </Field>
          <Button disabled={!write || busy || !client || !model}>
            {busy ? "Aguardando resposta…" : "Enviar teste"}
          </Button>
        </form>
      </Panel>
      <Panel title="Resposta">
        {result ? (
          <>
            <Badge tone={result.status < 400 ? "success" : "error"}>
              HTTP {result.status} · {result.duration} ms
            </Badge>
            <pre className="ag-code ag-response">{JSON.stringify(result.body, null, 2)}</pre>
          </>
        ) : (
          <Empty
            title="Pronto para testar"
            description="Selecione um cliente, a família e o modelo. O teste só é enviado ao clicar no botão."
          />
        )}
      </Panel>
    </div>
  );
}
function Integration({ system }: PageProps) {
  const [family, setFamily] = useState("anthropic"),
    [tool, setTool] = useState("claude");
  const base = system.addresses.apiBaseUrl,
    model =
      system.catalog.find((m) => m.kind === "text" && m.enabled && m.id.startsWith(family + "/"))
        ?.id || "";
  const tools =
    family === "anthropic"
      ? [
          ["claude", "Claude Code"],
          ["cline", "Cline"],
          ["continue", "Continue"],
          ["cursor", "Cursor"],
          ["curl", "Terminal / cURL"],
        ]
      : [
          ["cline", "Cline"],
          ["continue", "Continue"],
          ["cursor", "Cursor"],
          ["curl", "Terminal / cURL"],
        ];
  const chosen = tools.some((t) => t[0] === tool) ? tool : "cline";
  const snippet =
    chosen === "claude"
      ? `$env:ANTHROPIC_BASE_URL="${base.replace(/\/v1$/, "")}"
$env:ANTHROPIC_AUTH_TOKEN="SUA_CHAVE_DE_CLIENTE"
claude --model ${model}`
      : chosen === "continue"
        ? `name: Meu Gateway
version: 1.0.0
schema: v1
models:
  - name: ${label(model)}
    provider: openai
    model: ${model}
    apiBase: ${base}
    apiKey: SUA_CHAVE_DE_CLIENTE`
        : chosen === "curl"
          ? `curl "${base}/chat/completions" -H "Authorization: Bearer SUA_CHAVE_DE_CLIENTE" -H "Content-Type: application/json" -d '{"model":"${model}","messages":[{"role":"user","content":"Olá"}]}'`
          : `Base URL: ${base}
API Key: SUA_CHAVE_DE_CLIENTE
Model ID: ${model}`;
  const guides: Record<string, { steps: string[]; url: string }> = {
    claude: {
      steps: [
        "Abra o PowerShell e configure as variáveis abaixo com sua chave.",
        "Inicie o Claude Code com o modelo indicado. O endpoint usado é Messages.",
      ],
      url: "https://code.claude.com/docs/en/llm-gateway",
    },
    cline: {
      steps: [
        "Abra as configurações do Cline e escolha o provedor OpenAI Compatible.",
        "Informe Base URL, API Key e Model ID abaixo.",
        "Salve e envie uma mensagem para confirmar o acesso.",
      ],
      url: "https://docs.cline.bot/provider-config/openai-compatible",
    },
    continue: {
      steps: [
        "Abra a configuração YAML do Continue no VS Code.",
        "Adicione o modelo do exemplo abaixo, substituindo a chave.",
        "Salve e selecione o modelo no chat.",
      ],
      url: "https://docs.continue.dev/customize/model-providers/top-level/openai",
    },
    cursor: {
      steps: [
        "Abra Settings → Models e configure a chave OpenAI personalizada.",
        "Ative a URL base personalizada e informe o endereço abaixo.",
        "Adicione o ID do modelo. Recursos do Cursor que exigem Responses público ainda não são atendidos por esta API.",
      ],
      url: "https://cursor.com/help/models-and-usage/api-keys",
    },
    curl: {
      steps: [
        "Substitua SUA_CHAVE_DE_CLIENTE pela chave emitida no painel.",
        "Execute em um terminal compatível com a sintaxe cURL. No Windows PowerShell, use curl.exe.",
      ],
      url: "",
    },
  };
  return (
    <div className="ag-stack">
      <div className="ag-tabs">
        {families.map((f) => (
          <Button
            key={f.id}
            secondary
            aria-pressed={family === f.id}
            onClick={() => setFamily(f.id)}
          >
            <Brand family={f.id} />
          </Button>
        ))}
      </div>
      <div className="ag-tabs">
        {tools.map(([id, name]) => (
          <Button key={id} secondary onClick={() => setTool(id!)} aria-pressed={chosen === id}>
            {name}
          </Button>
        ))}
      </div>
      <Panel
        title={tools.find((x) => x[0] === chosen)?.[1] || "Integração"}
        description={`Família ${families.find((f) => f.id === family)?.name} · ${label(model)}`}
      >
        <ol className="ag-tutorial">
          {guides[chosen]!.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <pre className="ag-code">{snippet}</pre>
        <div className="ag-actions">
          <CopyButton value={snippet} />
          {guides[chosen]!.url && (
            <a href={guides[chosen]!.url} target="_blank" rel="noreferrer" className="ag-text-link">
              Documentação oficial <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </Panel>
      <Panel title="Dispositivos e acesso">
        <p>
          Se o cliente tiver trava ativa, configure no aplicativo um cabeçalho{" "}
          <code>X-Device-ID</code> com um valor único por instalação, por exemplo{" "}
          <code>meu-notebook-01</code>. Ele deve permanecer estável entre as chamadas. Aplicativos
          que não permitem cabeçalhos personalizados precisam usar um cliente sem trava.
        </p>
        <p className="ag-note">
          O identificador é declarado pelo aplicativo; não comprova a identidade física do aparelho.
          Compartilhar o mesmo ID também compartilha a vaga.
        </p>
      </Panel>
    </div>
  );
}

function Configuration({ system, write, reload, notify }: PageProps) {
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/admin/gateway", {
        method: "PATCH",
        body: JSON.stringify({
          action: "settings",
          global_rate_limit_rpm: Number(form.get("rpm")),
          default_model: form.get("model"),
        }),
      });
      reload();
      notify("Configuração aplicada.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <div className="ag-stack">
      <div className="ag-two">
        <Panel
          title="Política de atendimento"
          description="Valores persistidos e usados pela API nas novas requisições."
        >
          <form
            key={`${system.settings["global_rate_limit_rpm"]}-${system.settings["default_model"]}`}
            className="ag-stack"
            onSubmit={save}
          >
            <Field label="Limite global por minuto">
              <input
                name="rpm"
                type="number"
                required
                min={1}
                max={10000}
                defaultValue={system.settings["global_rate_limit_rpm"]}
                disabled={!write}
              />
            </Field>
            <Field label="Modelo padrão de texto">
              <select
                name="model"
                defaultValue={system.settings["default_model"]}
                disabled={!write}
              >
                {system.catalog
                  .filter((m) => m["kind"] === "text")
                  .map((m) => (
                    <option key={m["id"]} value={m["id"]}>
                      {label(m.id)}
                      {m["enabled"] ? "" : " · bloqueado"}
                    </option>
                  ))}
              </select>
            </Field>
            <p className="ag-note">
              RPM global e por cliente são compartilhados entre os endpoints desta instância. Os
              contadores de RPM reiniciam com o processo; a quota total do cliente fica no banco.
            </p>
            <Button disabled={!write}>Salvar configuração</Button>
          </form>
        </Panel>
        <Panel
          title="Seleção de credenciais"
          description="Como o gateway escolhe uma conexão Lovable."
        >
          <dl className="ag-details">
            <div>
              <dt>Provedor</dt>
              <dd>Lovable AI Gateway</dd>
            </div>
            <div>
              <dt>Distribuição</dt>
              <dd>Rodízio pela credencial usada há mais tempo</dd>
            </div>
            <div>
              <dt>Elegibilidade</dt>
              <dd>Ativa e abaixo da quota diária</dd>
            </div>
            <div>
              <dt>Créditos esgotados / HTTP 429</dt>
              <dd>Cooldown de 15 minutos</dd>
            </div>
            <div>
              <dt>Credencial recusada</dt>
              <dd>Desativada após HTTP 401/403</dd>
            </div>
          </dl>
          <a href="/admin/connections" className="ag-text-link">
            Alterar contas e limites diários
            <ArrowUpRight size={14} />
          </a>
        </Panel>
      </div>
      <Panel title="Diagnóstico da instalação">
        <dl className="ag-details">
          <div>
            <dt>Banco central</dt>
            <dd>
              <Badge tone="success">Consulta verificada</Badge>
            </dd>
          </div>
          <div>
            <dt>Entrada pública</dt>
            <dd>
              <code>{system.addresses.apiBaseUrl}</code>
            </dd>
          </div>
          <div>
            <dt>Painel</dt>
            <dd>
              <code>{system.addresses.panelUrl}</code>
            </dd>
          </div>
          <div>
            <dt>Última verificação</dt>
            <dd>{date(system.health["checkedAt"])}</dd>
          </div>
          <div>
            <dt>Prontidão das conexões</dt>
            <dd>
              {system.health["ready"]
                ? "Há credenciais elegíveis"
                : "Cadastre ou reative uma credencial"}
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
function PasswordForm({ notify }: { notify: (s: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("newPassword") !== form.get("confirmation")) {
      notify("As senhas novas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        }),
      });
      window.dispatchEvent(new Event("gateway-session-expired"));
      notify("Senha alterada. Entre novamente com a nova senha.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Sua senha" description="Trocar a senha encerra suas sessões anteriores.">
      <form className="ag-form-grid" onSubmit={save}>
        <Field label="Senha atual">
          <input type="password" name="currentPassword" autoComplete="current-password" required />
        </Field>
        <Field label="Nova senha (mínimo 14 caracteres)">
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            minLength={14}
            maxLength={256}
            required
          />
        </Field>
        <Field label="Confirme a nova senha">
          <input
            type="password"
            name="confirmation"
            autoComplete="new-password"
            minLength={14}
            maxLength={256}
            required
          />
        </Field>
        <div className="ag-form-submit">
          <Button disabled={busy}>{busy ? "Alterando…" : "Alterar minha senha"}</Button>
        </div>
      </form>
    </Panel>
  );
}
