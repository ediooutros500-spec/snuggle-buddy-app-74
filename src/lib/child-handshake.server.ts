import { timingSafeEqual } from "node:crypto";
import {
  createSignedHandshakeHeaders,
  getChildConfig,
  isAllowedChildOrigin,
  PARENT_ORIGIN,
  signHandshakePayload,
} from "./child-config.server";
import { getPoolAdmin } from "./key-pool.server";

type Result = { attempted: boolean; registered: boolean; message: string };
const recent = new Map<string, number>();
const inFlight = new Map<string, Promise<Result>>();
const HANDSHAKE_TTL_MS = 10 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

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
  let origin: string;
  try {
    origin = new URL(requestUrl).origin;
  } catch {
    return { attempted: false, registered: false, message: "Origem inválida." };
  }
  if ((!force && origin === PARENT_ORIGIN) || !isAllowedChildOrigin(origin))
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
  if (!cfg.lovableApiKey || !cfg.remixSyncSecret || !validDestination(cfg.gatorPublicUrl))
    return {
      attempted: false,
      registered: false,
      message:
        "Configure LOVABLE_API_KEY, REMIX_SYNC_SECRET e uma URL segura do Gator no servidor.",
    };

  const run = async (): Promise<Result> => {
    try {
      const response = await fetch(`${cfg.gatorPublicUrl}/api/public/v1/workers/register`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...createSignedHandshakeHeaders(cfg.remixSyncSecret, origin, cfg.lovableApiKey),
        },
        body: JSON.stringify({
          api_key: cfg.lovableApiKey,
          project_origin: origin,
          workspace_label: cfg.workspaceLabel,
          account_label: cfg.accountLabel,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("registered" in result) ||
        result.registered !== true ||
        !("worker_id" in result) ||
        typeof result.worker_id !== "string"
      )
        return {
          attempted: true,
          registered: false,
          message: "Registro não confirmado pelo Gator.",
        };
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

// Compatibility receiver in the Lovable app: the same mandatory HMAC contract as Gator.
export async function verifyIncomingHandshake(
  request: Request,
  apiKey: string,
  origin: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { remixSyncSecret: secret } = getChildConfig();
  if (!secret || !isAllowedChildOrigin(origin))
    return { ok: false, reason: "Configuração ou origem de handshake inválida." };
  const timestamp = request.headers.get("x-handshake-timestamp") ?? "";
  const nonce = request.headers.get("x-handshake-nonce") ?? "";
  const signature = request.headers.get("x-handshake-signature") ?? "";
  if (
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(Date.now() - Number(timestamp)) > CLOCK_SKEW_MS ||
    !/^[a-zA-Z0-9-]{16,128}$/.test(nonce) ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return { ok: false, reason: "Assinatura, timestamp ou nonce inválido." };
  const expected = signHandshakePayload(secret, origin, timestamp, nonce, apiKey);
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")))
    return { ok: false, reason: "Assinatura HMAC inválida." };
  const pool = getPoolAdmin();
  if (!pool) return { ok: false, reason: "Banco central indisponível." };
  try {
    const { error } = await pool.from("gateway_handshake_nonces").insert({ nonce, origin });
    if (error)
      return {
        ok: false,
        reason: error.code === "23505" ? "Replay detectado." : "Falha ao registrar nonce.",
      };
    return { ok: true };
  } catch {
    return { ok: false, reason: "Banco central indisponível." };
  }
}
