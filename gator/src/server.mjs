import { createServer } from "node:http";
import { readConfig } from "./config.mjs";

const config = readConfig();

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return json(response, 200, {
      ok: true,
      service: "zilong-gator",
      version: "0.1.0",
      configured: {
        supabase: config.hasSupabase,
        encryption: config.hasEncryptionKey,
        admin: config.hasAdminToken,
        lovable: config.hasLovableKey,
      },
      next: config.hasSupabase ? "ready-for-gateway-engine" : "configure-gator-supabase",
    });
  }

  return json(response, 404, { error: "not_found" });
});

server.listen(config.port, config.host, () => {
  console.log(`[gator] listening on ${config.host}:${config.port}`);
});
