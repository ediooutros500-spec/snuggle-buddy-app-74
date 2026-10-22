import { createServer } from "node:http";

export function createGatorServer(config, register) {
  const hits = new Map();
  const json = (res, status, body) => {
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    res.end(JSON.stringify(body));
  };
  return createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health")
        return json(res, 200, {
          ok: true,
          service: "zilong-gator",
          version: "0.1.0",
          configured: {
            supabase: config.hasSupabase,
            encryption: config.hasEncryptionKey,
            admin: config.hasAdminToken,
            lovable: config.hasLovableKey,
          },
          next: "validate-registration-and-gateway-engine",
        });
      if (req.method !== "POST" || req.url !== "/api/public/v1/workers/register")
        return json(res, 404, { error: "not_found" });
      const now = Date.now();
      for (const [ip, entry] of hits) if (entry.expires <= now) hits.delete(ip);
      // Forwarded headers are untrusted without an explicitly configured reverse proxy.
      const ip = req.socket.remoteAddress;
      const entry = hits.get(ip) ?? { count: 0, expires: now + 60_000 };
      if (entry.count >= 10 || (!hits.has(ip) && hits.size >= 5000))
        return json(res, 429, { error: "registration_rate_limit" });
      entry.count++;
      hits.set(ip, entry);
      if (req.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json")
        return json(res, 415, { error: "json_required" });
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 16_384) return json(res, 413, { error: "payload_too_large" });
        chunks.push(chunk);
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        return json(res, 400, { error: "invalid_json" });
      }
      const result = await register(req.headers, body);
      json(res, result.status, result.body);
    } catch {
      if (!res.headersSent) json(res, 503, { error: "service_unavailable" });
    }
  });
}
