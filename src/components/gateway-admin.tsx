import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  Plug,
  KeyRound,
  Boxes,
  BarChart3,
  ScrollText,
  FlaskConical,
  Code2,
  Settings2,
  ShieldCheck,
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
import { AdminTeam } from "./admin-team";
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
const ICONS = [
  Activity,
  Plug,
  KeyRound,
  Boxes,
  BarChart3,
  ScrollText,
  FlaskConical,
  Code2,
  Settings2,
  ShieldCheck,
];
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
            G<span>Lovable Gateway</span>
          </div>
          <Badge>Administração</Badge>
          <h1>
            Seu gateway,
            <br />
            sob controle.
          </h1>
          <p>Entre para administrar conexões, clientes e consumo do provedor Lovable.</p>
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
          <small>Acesso restrito à equipe autorizada.</small>
        </div>
      </div>
    );
  const write = user.role !== "viewer";
  return (
    <div className="gateway-admin">
      <aside className={`ag-sidebar ${mobile ? "open" : ""}`}>
        <a className="ag-logo" href="/admin/overview">
          G
          <span>
            Gateway<small>ADMIN CONSOLE</small>
          </span>
        </a>
        <button
          className="ag-mobile-close"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="ag-provider">
          <span className="ag-provider-icon">L</span>
          <div>
            <strong>Lovable AI Gateway</strong>
            <small>Provedor único</small>
          </div>
        </div>
        <nav>
          {["Operação", "Monitoramento", "Ferramentas", "Administração"].map((group) => (
            <div key={group}>
              <p className="ag-nav-group">{group}</p>
              {ADMIN_SECTIONS.map((item, i) => {
                const Icon = ICONS[i]!;
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
              {system?.health["ready"] ? "Conexões disponíveis" : "Aguardando conexão"}
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
              <span className="ag-eyebrow">LOVABLE · PROVEDOR ÚNICO</span>
              <h1>{active.label}</h1>
              <p>{active.description}</p>
            </div>
            {section === "overview" && (
              <a className="ag-link-button" href="/admin/connections">
                Gerenciar conexões
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
          <footer className="ag-footer">
            <span>Lovable Gateway · Administração de um provedor</span>
            <a
              href={system?.addresses.apiBaseUrl.replace(/\/v1$/, "") || "#"}
              target="_blank"
              rel="noreferrer"
            >
              API pública <ArrowUpRight size={12} />
            </a>
          </footer>
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
      return <Models {...props} />;
    case "usage":
      return <Usage {...props} />;
    case "requests":
      return <Requests {...props} />;
    case "playground":
      return <Playground {...props} />;
    case "integration":
      return <Integration {...props} />;
    case "settings":
      return <Configuration {...props} />;
    case "team":
      return (
        <div className="ag-stack">
          <PasswordForm notify={props.notify} />
          {props.user.role === "admin" ? (
            <AdminTeam />
          ) : (
            <Panel title="Seu acesso">
              <p>
                Seu perfil permite{" "}
                {props.write ? "operar conexões e clientes" : "consultar a operação"}. A gestão da
                equipe e a auditoria são exclusivas dos administradores.
              </p>
            </Panel>
          )}
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
function Overview({ system, refresh }: PageProps) {
  const { data, error } = useResource<UsageData>("/api/admin/usage?days=7", refresh);
  return (
    <div className="ag-stack">
      <Stats
        items={[
          {
            label: "Conexões disponíveis",
            value: integer(system.counts["availableCredentials"]),
            detail: `${integer(system.counts["credentials"])} credenciais cadastradas`,
          },
          {
            label: "Clientes ativos",
            value: integer(system.counts["activeClients"]),
            detail: `${integer(system.counts["clients"])} clientes no total`,
          },
          {
            label: "Requisições em 7 dias",
            value: data ? integer(data["requests"]) : "—",
            detail: data?.["sampled"]
              ? "Amostra dos 2.000 registros recentes"
              : "Solicitações registradas no histórico",
          },
          {
            label: "Tokens registrados",
            value: data ? integer(data["inputTokens"] + data["outputTokens"]) : "—",
            detail: data?.["unknownUsage"]
              ? `${data["unknownUsage"]} registros com uso desconhecido`
              : "Entrada + saída; sem estimativa de preço",
          },
        ]}
      />
      <div className="ag-two">
        <Panel
          title="Estado da operação"
          description="O que está disponível para atender chamadas agora."
        >
          <div className="ag-check-row">
            <span>Banco central</span>
            <Badge tone="success">Conectado</Badge>
          </div>
          <div className="ag-check-row">
            <span>Credenciais Lovable</span>
            <Badge tone={system.health["ready"] ? "success" : "warning"}>
              {system.health["ready"] ? "Prontas para seleção" : "Nenhuma disponível"}
            </Badge>
          </div>
          <div className="ag-check-row">
            <span>Distribuição</span>
            <strong>Rodízio entre credenciais elegíveis</strong>
          </div>
          <div className="ag-check-row">
            <span>Modelo padrão</span>
            <code>{system.settings["default_model"]}</code>
          </div>
          <div className="ag-check-row">
            <span>Limite global</span>
            <strong>{integer(system.settings["global_rate_limit_rpm"])} req/min</strong>
          </div>
          {!system.health["ready"] && (
            <div className="ag-alert warning">
              Cadastre uma credencial ou conecte um projeto Lovable para iniciar o atendimento. A
              API está publicada, mas precisa de uma chave do provedor.
            </div>
          )}
        </Panel>
        <Panel
          title="Conecte seu primeiro aplicativo"
          description="A chave do cliente é diferente da credencial Lovable."
        >
          <ol className="ag-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Conecte o provedor</strong>
                <p>Receba a chave de um projeto seu ou cadastre uma conexão.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Crie um cliente</strong>
                <p>Defina modelos, RPM e quota; copie a chave emitida uma única vez.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Use sua API</strong>
                <p>Configure o endereço e teste uma chamada com a chave do cliente.</p>
              </div>
            </li>
          </ol>
          <a className="ag-text-link" href="/admin/integration">
            Ver exemplos de integração <ArrowUpRight size={14} />
          </a>
        </Panel>
      </div>
      <Panel
        title="Atividade por dia"
        description="Somente os registros existentes no período, sem preencher números fictícios."
      >
        {error ? (
          <p className="ag-error">{error}</p>
        ) : data?.["byDay"]?.length ? (
          <div className="ag-bars">
            {data["byDay"].map((d: UsageGroup) => (
              <div key={d["name"]}>
                <span>{d["name"].slice(5)}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.max(3, (d["requests"] / Math.max(...data["byDay"].map((x: UsageGroup) => x["requests"]))) * 100)}%`,
                    }}
                  />
                </div>
                <strong>{integer(d["requests"])}</strong>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Ainda sem atividade registrada"
            description="As requisições aparecerão aqui depois dos primeiros testes e chamadas dos clientes."
          />
        )}
      </Panel>
    </div>
  );
}

function Connections({ write, refresh, reload, notify, system }: PageProps) {
  const { data, error } = useResource<{ rows: ConnectionRow[] }>("/api/admin/credentials", refresh),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<ConnectionRow | null>(null),
    [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const value: Record<string, unknown> = {
      account_label: form.get("account_label"),
      workspace_label: form.get("workspace_label"),
    };
    if (editing) {
      value["id"] = editing["id"];
      value["daily_request_limit"] =
        form.get("daily_request_limit") === "" ? null : Number(form.get("daily_request_limit"));
    } else {
      value["api_key"] = form.get("api_key");
      value["project_origin"] = form.get("project_origin");
    }
    try {
      await api("/api/admin/credentials", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(value),
      });
      setAdding(false);
      setEditing(null);
      reload();
      notify("Conexão salva.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function status(row: ConnectionRow) {
    try {
      await api("/api/admin/credentials", {
        method: "PATCH",
        body: JSON.stringify({
          id: row["id"],
          status: row["status"] === "disabled" ? "active" : "disabled",
        }),
      });
      reload();
      notify("Estado da conexão atualizado.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <div className="ag-stack">
      <Stats
        items={[
          {
            label: "Credenciais",
            value: integer(system.counts["credentials"]),
            detail: "Todas do provedor Lovable",
          },
          {
            label: "Disponíveis",
            value: integer(system.counts["availableCredentials"]),
            detail: "Ativas e dentro da quota diária",
          },
          {
            label: "Cadastro automático",
            value: "Habilitado",
            detail: "Projetos com o gatilho atualizado",
          },
        ]}
      />
      <Panel
        title="Suas conexões"
        description="Chaves do provedor são guardadas no servidor. A lista exibe apenas uma identificação parcial."
        action={
          <Button
            disabled={!write}
            onClick={() => {
              setAdding(!adding);
              setEditing(null);
            }}
          >
            <Plus size={15} />
            Adicionar conexão
          </Button>
        }
      >
        {(adding || editing) && (
          <form className="ag-form-box" onSubmit={save}>
            <h3>{editing ? "Editar conexão" : "Cadastrar chave Lovable"}</h3>
            <div className="ag-form-grid">
              <Field label="Identificação da conta">
                <input
                  name="account_label"
                  maxLength={80}
                  defaultValue={editing?.["account_label"] || ""}
                  placeholder="Minha conta principal"
                />
              </Field>
              <Field label="Workspace">
                <input
                  name="workspace_label"
                  maxLength={80}
                  defaultValue={editing?.["workspace_label"] || ""}
                  placeholder="Meu workspace"
                />
              </Field>
              {editing ? (
                <Field label="Limite diário (vazio = sem limite)">
                  <input
                    name="daily_request_limit"
                    type="number"
                    min={0}
                    defaultValue={editing["daily_request_limit"] ?? ""}
                  />
                </Field>
              ) : (
                <>
                  <Field label="URL do projeto Lovable">
                    <input
                      name="project_origin"
                      type="url"
                      required
                      placeholder="https://seu-projeto.lovable.app"
                    />
                  </Field>
                  <Field
                    label="Credencial Lovable"
                    hint="A validação envia uma requisição mínima ao provedor e pode consumir crédito."
                  >
                    <input
                      name="api_key"
                      type="password"
                      autoComplete="off"
                      minLength={8}
                      maxLength={8192}
                      required
                    />
                  </Field>
                </>
              )}
            </div>
            <div className="ag-actions">
              <Button disabled={busy}>
                {busy
                  ? "Validando e salvando…"
                  : editing
                    ? "Salvar conexão"
                    : "Validar e cadastrar"}
              </Button>
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
        {error ? (
          <p className="ag-error">{error}</p>
        ) : data?.["rows"].length ? (
          <GridTable
            heads={["Conta / projeto", "Chave", "Estado", "Uso diário", "Último uso", "Ações"]}
          >
            {data["rows"].map((row: ConnectionRow) => (
              <tr key={row["id"]}>
                <td>
                  <strong>{row["account_label"] || "Conta sem identificação"}</strong>
                  <small>{row["workspace_label"] || "Workspace não informado"}</small>
                  <a
                    href={row["project_origin"]}
                    target="_blank"
                    rel="noreferrer"
                    className="ag-origin"
                  >
                    {row["project_origin"]}
                  </a>
                </td>
                <td>
                  <code>{row["key_hint"]}</code>
                </td>
                <td>
                  <Badge
                    tone={
                      row["status"] === "active"
                        ? "success"
                        : row["status"] === "exhausted"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {row["status"] === "active"
                      ? "Ativa"
                      : row["status"] === "exhausted"
                        ? "Em cooldown"
                        : "Desativada"}
                  </Badge>
                  {row["last_error"] && <small className="ag-error">{row["last_error"]}</small>}
                </td>
                <td>
                  {row["usage_date"] === new Date().toISOString().slice(0, 10)
                    ? integer(row["requests_today"])
                    : 0}{" "}
                  / {row["daily_request_limit"] ?? "∞"}
                  <small>{integer(row["total_requests"])} seleções no total</small>
                </td>
                <td>{date(row["last_used_at"])}</td>
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
                    <Button secondary disabled={!write} onClick={() => status(row)}>
                      {row["status"] === "disabled" ? "Retomar" : "Desativar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </GridTable>
        ) : (
          <Empty
            title="Nenhuma conexão Lovable cadastrada"
            description="Adicione uma chave sua ou conecte um projeto com o cadastro automático abaixo."
          />
        )}
      </Panel>
      <AutomaticRegistration notify={notify} write={write} reload={reload} />
    </div>
  );
}
function AutomaticRegistration({
  notify,
  write,
  reload,
}: {
  notify: (s: string) => void;
  write: boolean;
  reload: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      result?: { registered?: boolean; message?: string };
      error?: string;
    } | null>(null);
  async function sync(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(e.currentTarget);
      const r = await fetch("/api/public/v1/workers/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_origin: form.get("origin") }),
      });
      const d = await r.json();
      setResult(d);
      if (d.result?.registered) reload();
      if (!r.ok) notify(d.error || "O projeto não confirmou o registro.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Conectar um projeto automaticamente"
      description="O projeto precisa conter o gatilho atualizado e ter sua própria chave Lovable disponível no servidor."
    >
      <form className="ag-inline-form" onSubmit={sync}>
        <Field label="Projeto publicado">
          <input name="origin" type="url" required placeholder="https://seu-projeto.lovable.app" />
        </Field>
        <Button disabled={!write || busy}>
          {busy ? "Consultando projeto…" : "Solicitar cadastro"}
        </Button>
      </form>
      {result && (
        <div className={`ag-alert ${result["result"]?.registered ? "success" : "warning"}`}>
          <strong>
            {result["result"]?.registered ? "Cadastro confirmado" : "Cadastro não confirmado"}
          </strong>
          <span>
            {result["result"]?.message ||
              result["error"] ||
              "O sinal foi entregue; o projeto ainda não confirmou o cadastro."}
          </span>
        </div>
      )}
      <p className="ag-note">
        O envio acontece na primeira execução do projeto publicado. Um remix antigo precisa receber
        o gatilho atualizado; apenas duplicar o projeto não executa o cadastro.
      </p>
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
            <Field
              label="Modelos permitidos"
              hint="Nenhum selecionado permite todos os modelos liberados globalmente. Use Ctrl/Cmd para selecionar mais de um."
            >
              <select name="models" multiple defaultValue={editing?.["allowed_models"] || []}>
                {system.catalog.map((m) => (
                  <option key={m["id"]} value={m["id"]}>
                    {m["id"]}
                    {m["enabled"] ? "" : " · bloqueado globalmente"}
                  </option>
                ))}
              </select>
            </Field>
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
              heads={["Cliente", "Chave", "Modelos", "Consumo / quota", "RPM", "Acesso", "Ações"]}
            >
              {data["rows"].map((row: ClientRow) => (
                <tr key={row["id"]}>
                  <td>
                    <strong>{row["name"]}</strong>
                    <small>{row["notes"] || date(row["created_at"])}</small>
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
                    <Badge tone={row["status"] === "active" ? "success" : "neutral"}>
                      {row["status"] === "active" ? "Ativo" : "Suspenso"}
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

function Models({ system, write, reload, notify }: PageProps) {
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
        title="Catálogo do provedor"
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
                <code>{m["id"]}</code>
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

function Usage({ refresh }: PageProps) {
  const [days, setDays] = useState("7");
  const { data, error } = useResource<UsageData>(`/api/admin/usage?days=${days}`, refresh);
  return (
    <div className="ag-stack">
      <div className="ag-filters">
        <Field label="Período">
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="1">Últimas 24 horas</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </Field>
      </div>
      {error && <div className="ag-alert error">{error}</div>}
      <Stats
        items={[
          {
            label: "Solicitações registradas",
            value: data ? integer(data["requests"]) : "—",
            detail: data?.["sampled"]
              ? `Amostra: 2.000 de ${integer(data["totalMatching"])}`
              : "Inclui rejeições e erros registrados",
          },
          {
            label: "Respostas sem erro",
            value: data ? integer(data["success"]) : "—",
            detail: `${integer(data?.["errors"])} solicitações com erro`,
          },
          {
            label: "Tokens de entrada",
            value: data ? integer(data["inputTokens"]) : "—",
            detail: "Somente uso informado nas respostas",
          },
          {
            label: "Tokens de saída",
            value: data ? integer(data["outputTokens"]) : "—",
            detail: `${integer(data?.["unknownUsage"])} registros com uso desconhecido`,
          },
        ]}
      />
      <div className="ag-alert warning">
        Custo financeiro indisponível: o provedor não forneceu uma cobrança conciliada. Tokens
        desconhecidos não são convertidos em custo estimado.
      </div>
      <div className="ag-two">
        {(
          [
            ["Por modelo", "byModel"],
            ["Por cliente", "byClient"],
          ] as [string, "byModel" | "byClient"][]
        ).map(([title, key]) => (
          <Panel
            key={key}
            title={title!}
            description="Agrupamento dos registros disponíveis no período."
          >
            {data?.[key!]?.length ? (
              <GridTable heads={["Nome", "Requisições", "Erros", "Tokens"]}>
                {data[key!].map((r: UsageGroup) => (
                  <tr key={r["name"]}>
                    <td>
                      <strong>{r["name"]}</strong>
                    </td>
                    <td>{integer(r["requests"])}</td>
                    <td>{integer(r["errors"])}</td>
                    <td>{integer(r["inputTokens"] + r["outputTokens"])}</td>
                  </tr>
                ))}
              </GridTable>
            ) : (
              <Empty
                title="Sem registros neste período"
                description="Amplie o período ou faça uma chamada de teste com uma chave de cliente."
              />
            )}
          </Panel>
        ))}
      </div>
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
                <option key={m["id"]}>{m["id"]}</option>
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
                    <strong>{r["resolved_model"] || "Não resolvido"}</strong>
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

function Playground({ system, notify }: PageProps) {
  const [credential, setCredential] = useState(""),
    [model, setModel] = useState(system.settings["default_model"]),
    [prompt, setPrompt] = useState(""),
    [result, setResult] = useState<{ status: number; duration: number; body: unknown } | null>(
      null,
    ),
    [busy, setBusy] = useState(false);
  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const start = performance.now();
    try {
      const response = await fetch(`${system.addresses.apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${credential}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 256,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });
      const body = await response.json();
      setResult({ status: response.status, duration: Math.round(performance.now() - start), body });
      if (!response.ok) notify(body.error?.message || "A API recusou o teste.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ag-two">
      <Panel
        title="Enviar uma mensagem"
        description="Esta é uma chamada real: usa a quota do cliente e pode consumir créditos Lovable."
      >
        <form onSubmit={send} className="ag-stack">
          <Field
            label="Chave de API do cliente"
            hint="A chave permanece somente nesta tela e não é salva no navegador."
          >
            <input
              type="password"
              autoComplete="off"
              required
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="gw_…"
            />
          </Field>
          <Field label="Modelo">
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {system.catalog
                .filter((m) => m["kind"] === "text" && m["enabled"])
                .map((m) => (
                  <option key={m["id"]}>{m["id"]}</option>
                ))}
            </select>
          </Field>
          <Field label="Mensagem">
            <textarea
              required
              maxLength={8000}
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Escreva uma mensagem para testar sua integração."
            />
          </Field>
          <Button disabled={busy}>
            {busy ? "Aguardando resposta…" : "Enviar teste"}
            <ArrowUpRight size={15} />
          </Button>
        </form>
      </Panel>
      <Panel title="Resposta" description="O resultado e o uso retornados pela própria API.">
        {result ? (
          <>
            <div className="ag-actions">
              <Badge tone={result["status"] < 400 ? "success" : "error"}>
                HTTP {result["status"]}
              </Badge>
              <span className="ag-muted">{result["duration"]} ms</span>
            </div>
            <pre className="ag-code ag-response">{JSON.stringify(result["body"], null, 2)}</pre>
          </>
        ) : (
          <Empty
            title="Pronto para testar"
            description="Preencha os campos e envie a mensagem. Nenhuma chamada é feita automaticamente."
          />
        )}
      </Panel>
    </div>
  );
}
function Integration({ system }: PageProps) {
  const base = system.addresses.apiBaseUrl;
  const snippet = `curl '${base}/chat/completions' \\\n  -H 'Authorization: Bearer SUA_CHAVE_DE_CLIENTE' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"model":"${system.settings["default_model"]}","messages":[{"role":"user","content":"Olá"}]}'`;
  return (
    <div className="ag-stack">
      <Panel
        title="Endereço da API"
        description="Use uma chave criada em Clientes e chaves. Credenciais Lovable nunca são usadas diretamente no aplicativo cliente."
      >
        <div className="ag-secret">
          <code>{base}</code>
          <CopyButton value={base} />
        </div>
      </Panel>
      <div className="ag-two">
        <Panel
          title="OpenAI Chat Completions"
          description="Para aplicativos que permitem configurar uma URL base compatível."
        >
          <dl className="ag-details">
            <div>
              <dt>Base URL</dt>
              <dd>
                <code>{base}</code>
              </dd>
            </div>
            <div>
              <dt>API key</dt>
              <dd>Chave do cliente emitida neste painel</dd>
            </div>
            <div>
              <dt>Modelo</dt>
              <dd>
                <code>{system.settings["default_model"]}</code>
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel
          title="Anthropic Messages"
          description="Compatibilidade de formato; modelos Claude são aliases para destinos do catálogo Lovable."
        >
          <code>{base}/messages</code>
          <p className="ag-note">
            Autenticação por Bearer ou x-api-key. O nome do alias não representa acesso à API
            oficial da Anthropic.
          </p>
        </Panel>
      </div>
      <Panel title="Exemplo de requisição" action={<CopyButton value={snippet} />}>
        <pre className="ag-code">{snippet}</pre>
      </Panel>
      <Panel
        title="Endpoints disponíveis"
        description="A existência da rota não garante a disponibilidade de cada modelo/modalidade no provedor."
      >
        <GridTable heads={["Método", "Caminho", "Uso"]}>
          {[
            ["GET", "/models", "Catálogo permitido para a chave"],
            ["POST", "/chat/completions", "Chat no formato OpenAI"],
            ["POST", "/messages", "Mensagens no formato Anthropic"],
            ["POST", "/images/generations", "Geração de imagem"],
            ["POST", "/embeddings", "Vetores de texto"],
            ["POST", "/videos/generations", "Geração de vídeo"],
          ].map(([method, path, label]) => (
            <tr key={path}>
              <td>
                <Badge>{method}</Badge>
              </td>
              <td>
                <code>{path}</code>
              </td>
              <td>{label}</td>
            </tr>
          ))}
        </GridTable>
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
                      {m["id"]}
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
