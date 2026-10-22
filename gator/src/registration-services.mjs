export function registrationServices(env = process.env, fetcher = fetch) {
  const url = env.GATOR_SUPABASE_URL;
  const key = env.GATOR_SUPABASE_SERVICE_ROLE_KEY;
  let store;
  if (url && key) {
    const base = new URL(url);
    if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname))
      throw new Error("Supabase requires HTTPS outside localhost");
    const headers = { apikey: key, "content-type": "application/json" };
    if (!key.startsWith("sb_secret_")) headers.authorization = `Bearer ${key}`;
    const post = (path, body) =>
      fetcher(new URL(`/rest/v1/${path}`, base), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
    store = {
      async claimNonce(nonce, origin) {
        const response = await post("gateway_handshake_nonces", { nonce, origin });
        if (response.status === 409 && (await response.json()).code === "23505") return false;
        if (!response.ok) throw new Error("Nonce persistence unavailable");
        return true;
      },
      async register(apiKey, origin, status) {
        const response = await post("rpc/register_worker_key", {
          p_api_key: apiKey,
          p_origin: origin,
          p_status: status,
          p_error: null,
        });
        if (!response.ok) throw new Error("Worker persistence unavailable");
        const id = await response.json();
        if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))
          throw new Error("Unexpected worker identifier");
        const lookup = new URL("/rest/v1/gateway_workers", base);
        lookup.searchParams.set("select", "id");
        lookup.searchParams.set("origin", `eq.${origin}`);
        lookup.searchParams.set("key_pool_id", `eq.${id}`);
        lookup.searchParams.set("limit", "1");
        const worker = await fetcher(lookup, {
          headers,
          redirect: "error",
          signal: AbortSignal.timeout(8000),
        });
        if (!worker.ok) throw new Error("Worker lookup unavailable");
        const rows = await worker.json();
        if (
          !Array.isArray(rows) ||
          typeof rows[0]?.id !== "string" ||
          !/^[a-f0-9-]{36}$/.test(rows[0].id)
        )
          throw new Error("Unexpected worker identifier");
        return rows[0].id;
      },
    };
  }
  return {
    secret: env.REMIX_SYNC_SECRET?.trim(),
    mode: env.GATOR_REGISTRATION_MODE ?? "auto",
    store,
    async validateKey(apiKey) {
      const response = await fetcher("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      await response.body?.cancel();
      if (response.ok) return "active";
      if ([401, 403].includes(response.status)) return "invalid";
      if ([402, 429].includes(response.status)) return "exhausted";
      return "unavailable";
    },
  };
}
