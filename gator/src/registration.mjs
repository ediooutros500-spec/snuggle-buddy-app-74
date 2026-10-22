import { createHmac, timingSafeEqual } from "node:crypto";

const failure = (status, error) => ({ status, body: { error } });

export function createRegistration({ secret, store, validateKey, now = Date.now }) {
  return async (headers, body) => {
    if (!secret || !store) return failure(503, "registration_not_configured");
    const origin = body?.project_origin;
    const key = body?.api_key;
    if (typeof key !== "string" || key.length < 8 || key.length > 8192)
      return failure(400, "invalid_payload");
    try {
      const url = new URL(origin);
      if (
        url.origin !== origin ||
        url.protocol !== "https:" ||
        ![".lovable.app", ".lovableproject.com", ".lovable.dev"].some((s) =>
          url.hostname.endsWith(s),
        )
      )
        return failure(400, "origin_not_allowed");
    } catch {
      return failure(400, "origin_not_allowed");
    }
    const timestamp = headers["x-handshake-timestamp"];
    const nonce = headers["x-handshake-nonce"];
    const signature = headers["x-handshake-signature"];
    if (
      typeof timestamp !== "string" ||
      !/^\d{13}$/.test(timestamp) ||
      Math.abs(now() - Number(timestamp)) > 300_000 ||
      typeof nonce !== "string" ||
      !/^[a-zA-Z0-9-]{16,128}$/.test(nonce) ||
      typeof signature !== "string" ||
      !/^[a-f0-9]{64}$/.test(signature)
    )
      return failure(401, "invalid_handshake");
    const expected = createHmac("sha256", secret)
      .update(`${origin}|${timestamp}|${nonce}|${key}`)
      .digest();
    if (!timingSafeEqual(Buffer.from(signature, "hex"), expected))
      return failure(401, "invalid_handshake");
    try {
      if (!(await store.claimNonce(nonce, origin))) return failure(409, "replay_detected");
      const status = await validateKey(key);
      if (status === "invalid") return failure(400, "invalid_upstream_key");
      if (status !== "active" && status !== "exhausted")
        return failure(503, "upstream_validation_unavailable");
      const workerId = await store.register(key, origin, status);
      return { status: 200, body: { registered: true, worker_id: workerId, status } };
    } catch {
      return failure(503, "registration_unavailable");
    }
  };
}
