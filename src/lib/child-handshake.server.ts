import {
  createSignedHandshakeHeaders,
  getChildConfig,
  isAllowedChildOrigin,
} from "./child-config.server";

type Result = { attempted: boolean; registered: boolean; message: string };
const recent = new Map<string, number>();
const inFlight = new Map<string, Promise<Result>>();
const HANDSHAKE_TTL_MS = 10 * 60 * 1000;

/** Public diagnostic only: credentials and account labels never leave the server here. */
export function getChildRegistrationStatus(requestUrl: string) {
  const central = process.env["GATEWAY_ROLE"] === "central";
  if (central) return { role: "central" as const, protocolVersion: 1 };
  const cfg = getChildConfig();
  let origin = "";
  try {
    origin = new URL(requestUrl).origin;
  } catch {
    /* Invalid origin remains unsupported. */
  }
  const originAllowed = isAllowedChildOrigin(origin);
  const destinationConfigured = validDestination(cfg.gatorPublicUrl);
  const keyAvailable = Boolean(cfg.lovableApiKey);
  const signingConfigured = cfg.registrationMode !== "signed" || Boolean(cfg.remixSyncSecret);
  const confirmedAt = recent.get(origin);
  return {
    role: "child" as const,
    protocolVersion: 1,
    centralOrigin: destinationConfigured ? cfg.gatorPublicUrl : null,
    projectOrigin: origin,
    keyAvailable,
    originAllowed,
    registered: Boolean(confirmedAt && Date.now() - confirmedAt < HANDSHAKE_TTL_MS),
    ready: originAllowed && destinationConfigured && keyAvailable && signingConfigured,
    reason: !originAllowed
      ? "unsupported_origin"
      : !destinationConfigured
        ? "missing_central"
        : !keyAvailable
          ? "missing_key"
          : !signingConfigured
            ? "missing_signature"
            : "ready",
  };
}

function validDestination(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === value &&
      (url.protocol === "https:" ||
        (process.env["NODE_ENV"] !== "production" &&
          url.protocol === "http:" &&
          ["127.0.0.1", "localhost"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

export async function triggerChildHandshake(requestUrl: string, force = false): Promise<Result> {
  if (process.env["GATEWAY_ROLE"] === "central")
    return {
      attempted: false,
      registered: false,
      message: "Pai central: auto-registro desativado.",
    };
  let origin: string;
  try {
    origin = new URL(requestUrl).origin;
  } catch {
    return { attempted: false, registered: false, message: "Origem inválida." };
  }
  if (!isAllowedChildOrigin(origin))
    return { attempted: false, registered: false, message: "Origem ignorada no auto-registro." };
  for (const [entry, at] of recent) if (Date.now() - at >= HANDSHAKE_TTL_MS) recent.delete(entry);
  if (!force && recent.has(origin))
    return {
      attempted: false,
      registered: true,
      message: "Registro recente confirmado pelo Gator.",
    };
  const pending = inFlight.get(origin);
  if (pending) return pending;
  // Bound process memory even if requests arrive with many different Host values.
  if (inFlight.size >= 100 || recent.size >= 1000)
    return { attempted: false, registered: false, message: "Limite temporário de registros." };
  const cfg = getChildConfig();
  if (
    !cfg.lovableApiKey ||
    (cfg.registrationMode === "signed" && !cfg.remixSyncSecret) ||
    !validDestination(cfg.gatorPublicUrl)
  )
    return {
      attempted: false,
      registered: false,
      message: "A chave Lovable ou o endereço HTTPS da central não está disponível neste remix.",
    };

  const run = async (): Promise<Result> => {
    try {
      const response = await fetch(`${cfg.gatorPublicUrl}/api/public/v1/workers/register`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(cfg.registrationMode === "signed"
            ? createSignedHandshakeHeaders(cfg.remixSyncSecret, origin, cfg.lovableApiKey)
            : {}),
        },
        body: JSON.stringify({
          api_key: cfg.lovableApiKey,
          project_origin: origin,
          workspace_label: cfg.workspaceLabel,
          account_label: cfg.accountLabel,
        }),
        // Workers only accepts follow/manual. Never forward a credential to a redirected host.
        redirect: "manual",
        // Receiver may spend 8s validating upstream plus database calls; give it a full budget.
        signal: AbortSignal.timeout(25000),
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        return {
          attempted: true,
          registered: false,
          message:
            "A central respondeu com redirecionamento. O envio não foi repetido em outro destino.",
        };
      }
      const result: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("registered" in result) ||
        result.registered !== true ||
        !("worker_id" in result) ||
        typeof result.worker_id !== "string"
      ) {
        const reasons: Record<string, string> = {
          invalid_upstream_key: "O provedor recusou a credencial deste projeto.",
          upstream_validation_unavailable: "A central não conseguiu validar a chave no provedor.",
          registration_unavailable: "A central não conseguiu salvar o cadastro no banco.",
          registration_not_configured: "O receptor da central não está configurado.",
          registration_rate_limit: "Limite temporário de cadastros na central; aguarde um minuto.",
          origin_registration_rate_limit:
            "Este projeto atingiu o limite temporário; aguarde um minuto.",
        };
        const errorCode =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "";
        return {
          attempted: true,
          registered: false,
          message: `Registro não confirmado pela central (HTTP ${response.status}). ${reasons[errorCode] || "Tente novamente e confira o receptor."}`,
        };
      }
      recent.set(origin, Date.now());
      return { attempted: true, registered: true, message: "Remix registrado no Gator." };
    } catch {
      return { attempted: true, registered: false, message: "Falha ao contatar o Gator." };
    }
  };
  const task = run();
  inFlight.set(origin, task);
  try {
    return await task;
  } finally {
    inFlight.delete(origin);
  }
}
