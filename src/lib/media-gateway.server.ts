import {
  authenticateGatewayRequest,
  checkRateLimit,
  CORS_HEADERS,
  rateLimitKey,
  safeEqual,
} from "./claude-compat.server";
import { fetchGatewayWithFailover } from "./key-pool.server";

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
  const limit = auth.client?.rate_limit_rpm || 120;
  const rl = checkRateLimit(
    auth.client ? `client:${auth.client.id}` : rateLimitKey(request),
    limit,
  );
  if (!rl.ok)
    return {
      response: jsonMedia(
        { error: { type: "rate_limit_error", message: "Limite de requisições atingido." } },
        429,
        { "Retry-After": String(rl.retryAfter) },
      ),
    };
  return { auth };
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
