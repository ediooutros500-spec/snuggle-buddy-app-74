import { existsSync } from "node:fs";

process.env.NODE_ENV = "production";
process.env.GATEWAY_ROLE = "central";
process.env.HOST ??= "127.0.0.1";
process.env.PORT ??= "3000";
// Existing compatibility routes use this name; keep one server-side admin secret.
if (!process.env.CLAUDE_CODE_GATEWAY_TOKEN && process.env.GATOR_ADMIN_TOKEN)
  process.env.CLAUDE_CODE_GATEWAY_TOKEN = process.env.GATOR_ADMIN_TOKEN;
const entry = new URL("../.output/server/index.mjs", import.meta.url);
if (!existsSync(entry)) throw new Error("Execute npm run build:parent antes de iniciar o pai.");
await import(entry.href);
