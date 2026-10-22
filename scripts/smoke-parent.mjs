import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";

const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const token = randomBytes(32).toString("hex");
const server = spawn(process.execPath, ["scripts/start-parent.mjs"], {
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    GATOR_ADMIN_TOKEN: token,
    CLAUDE_CODE_GATEWAY_TOKEN: token,
  },
  stdio: "ignore",
});
let exited = false;
server.once("exit", () => {
  exited = true;
});
server.once("error", () => {
  exited = true;
});
try {
  const base = `http://127.0.0.1:${port}`;
  let health;
  for (let attempt = 0; attempt < 60 && !exited; attempt++) {
    try {
      health = await fetch(`${base}/api/public/health`, { signal: AbortSignal.timeout(1000) });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!health?.ok || (await health.json()).role !== "central") throw new Error("health_failed");
  const home = await fetch(base, { signal: AbortSignal.timeout(5000) });
  const admin = await fetch(`${base}/api/admin/gateway`, { signal: AbortSignal.timeout(5000) });
  if (!home.ok || admin.status !== 401) throw new Error("parent_smoke_failed");
  console.log(
    "Parent Node smoke passed: health 200, central role, home 200, unauthenticated admin 401.",
  );
} catch {
  console.error("Parent Node smoke failed.");
  process.exitCode = 1;
} finally {
  if (!exited) {
    const stopped = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await stopped;
  }
}
