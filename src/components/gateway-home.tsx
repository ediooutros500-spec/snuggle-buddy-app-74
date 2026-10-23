import { useCallback, useEffect, useState } from "react";
import { GatewayAdmin } from "./gateway-admin";
import "./gateway-admin.css";

type ProjectStatus = {
  role: "central" | "child";
  centralOrigin?: string | null;
  projectOrigin?: string;
  keyAvailable?: boolean;
  registered?: boolean;
  reason?: string;
};
type RegistrationResult = { registered: boolean; message: string };
const STATUS_URL = "/api/public/v1/workers/announce";

export function GatewayHome() {
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch(STATUS_URL, { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data: ProjectStatus = await r.json();
        if (!["central", "child"].includes(data.role)) throw new Error();
        setStatus(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Não foi possível identificar esta instalação.");
      });
    return () => controller.abort();
  }, [attempt]);
  if (!status)
    return (
      <main className="gateway-admin ag-login">
        <section className="ag-login-card">
          <h1>Lovable Gateway</h1>
          <p role="status">{error || "Identificando esta instalação…"}</p>
          {error && (
            <button className="ag-button" onClick={() => setAttempt((n) => n + 1)}>
              Tentar novamente
            </button>
          )}
        </section>
      </main>
    );
  return status.role === "central" ? (
    <GatewayAdmin section="overview" />
  ) : (
    <ProjectConnector initial={status} />
  );
}

function ProjectConnector({ initial }: { initial: ProjectStatus }) {
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const connect = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(STATUS_URL, {
        method: "POST",
        headers: { "x-child-auto-dispatch": "1" },
        signal: AbortSignal.timeout(35000),
      });
      if (!r.ok) throw new Error();
      const data: RegistrationResult = await r.json();
      setResult({ registered: data.registered === true, message: data.message });
    } catch {
      setResult({
        registered: false,
        message: "A central não confirmou o cadastro. Tente novamente.",
      });
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void connect();
  }, [connect]);
  const registered = result?.registered ?? initial.registered;
  return (
    <main className="gateway-admin ag-login">
      <section className="ag-login-card" style={{ width: 620 }}>
        <div className="ag-logo">Lovable Gateway</div>
        <small>PROJETO DE ORIGEM</small>
        <h1>{registered ? "Projeto cadastrado." : "Conecte este projeto."}</h1>
        <p>
          Este é o projeto de origem para seus remixes. A administração, as chaves dos clientes e a
          API ficam na central da VPS.
        </p>
        <dl className="ag-project-details">
          <dt>Projeto</dt>
          <dd>{initial.projectOrigin}</dd>
          <dt>Central de destino</dt>
          <dd>{initial.centralOrigin || "Endereço não configurado"}</dd>
          <dt>Credencial no servidor</dt>
          <dd>
            {initial.keyAvailable
              ? "Disponível; não exibida no navegador"
              : "LOVABLE_API_KEY não disponível"}
          </dd>
          <dt>Cadastro</dt>
          <dd role="status">
            {busy
              ? "Aguardando confirmação da central…"
              : result?.message || "Aguardando primeira execução"}
          </dd>
        </dl>
        <button className="ag-button" disabled={busy} onClick={() => void connect()}>
          {busy ? "Conectando…" : registered ? "Conferir conexão" : "Tentar conectar novamente"}
        </button>
        {initial.reason === "missing_key" && (
          <p>
            Ative uma função de IA no Lovable e confira o segredo LOVABLE_API_KEY no backend deste
            projeto. O remix precisa receber sua própria credencial do Lovable.
          </p>
        )}
        {initial.reason === "unsupported_origin" && (
          <p>
            O cadastro automático aceita projetos publicados em domínio Lovable. Uma prévia local
            não é registrada.
          </p>
        )}
        <p>
          Depois de remixar, publique e abra o novo projeto. O gatilho envia a credencial
          diretamente do servidor à sua central por HTTPS. Duplicar o projeto, sozinho, não executa
          o gatilho.
        </p>
        <p>
          O envio inclui apenas a credencial deste projeto, sua origem e os rótulos configurados de
          conta/workspace. A central valida e guarda a credencial cifrada.
        </p>
        <p>
          <a
            href="https://secretsof.delvertokens.store/admin/overview"
            target="_blank"
            rel="noreferrer"
          >
            Abrir administração na VPS ↗
          </a>
        </p>
        <p>
          API dos seus aplicativos: <code>https://api.delvertokens.store/v1</code>
        </p>
      </section>
    </main>
  );
}
