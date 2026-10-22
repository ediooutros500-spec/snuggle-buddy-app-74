import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const child = spawn(process.execPath, [vite, "build"], {
  stdio: "inherit",
  env: { ...process.env, NITRO_PRESET: "node-server", GATEWAY_ROLE: "central" },
});
child.once("error", () => {
  console.error("Não foi possível iniciar o build do pai.");
  process.exitCode = 1;
});
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
