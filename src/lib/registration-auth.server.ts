import { timingSafeEqual } from "node:crypto";
import { getChildConfig, isAllowedChildOrigin, signHandshakePayload } from "./child-config.server";
import { getPoolAdmin } from "./key-pool.server";
const CLOCK_SKEW_MS = 5 * 60 * 1000;

// In automatic mode this validates the envelope only. The route MUST validate the key upstream before saving.
export async function verifyIncomingHandshake(
  request: Request,
  apiKey: string,
  origin: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { remixSyncSecret: secret, registrationMode } = getChildConfig();
  if (!isAllowedChildOrigin(origin))
    return { ok: false, reason: "Configuração ou origem de handshake inválida." };
  if (registrationMode === "auto") return { ok: true };
  if (!secret) return { ok: false, reason: "Segredo de assinatura não configurado." };
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
