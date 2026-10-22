import { authenticateGatewayRequest, CORS_HEADERS } from "./claude-compat.server";
import { fetchGatewayWithFailover } from "./key-pool.server";

import {
  admitModelAttempt,
  policyErrorResponse,
  readGatewaySettings,
} from "./gateway-policy.server";

export const MEDIA_HEADERS = {
  ...CORS_HEADERS,
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
};
export const jsonMedia = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...MEDIA_HEADERS, ...extra },
  });

export async function authorizeMedia(request: Request) {
  const auth = await authenticateGatewayRequest(request);
  if (!auth.authorized)
    return {
      response: jsonMedia(
        { error: { type: "authentication_error", message: "Token inválido." } },
        401,
      ),
    };
  try {
    return { auth, settings: await readGatewaySettings() };
  } catch (error) {
    return { response: policyErrorResponse(error) };
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (text.length > 2_000_000) return null;
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export async function forwardMedia(url: string, payload: Record<string, unknown>) {
  return fetchGatewayWithFailover(url, payload, 3);
}

export function upstreamError(upstream: Response | null, networkError: boolean) {
  if (networkError)
    return jsonMedia({ error: { type: "api_error", message: "Serviço de IA indisponível." } }, 502);
  if (!upstream)
    return jsonMedia(
      { error: { type: "api_error", message: "Nenhuma chave ativa disponível." } },
      503,
    );
  if (upstream.status === 402)
    return jsonMedia(
      { error: { type: "billing_error", message: "Créditos de IA esgotados." } },
      402,
    );
  if (upstream.status === 429)
    return jsonMedia(
      { error: { type: "rate_limit_error", message: "Limite do provedor atingido." } },
      429,
    );
  return jsonMedia(
    { error: { type: "api_error", message: "O serviço de IA retornou um erro." } },
    502,
  );
}

export async function admitMediaModel(
  gate: Awaited<ReturnType<typeof authorizeMedia>>,
  model: string,
): Promise<Response | null> {
  if (!gate.auth || !gate.settings)
    return gate.response || jsonMedia({ error: { message: "Política indisponível." } }, 503);
  try {
    await admitModelAttempt(model, gate.auth, gate.settings);
    return null;
  } catch (error) {
    return policyErrorResponse(error);
  }
}
