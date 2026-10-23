import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const manifest = createRequire(import.meta.url)("../backend/mcp/icons.json");
export function withConnectorIcon(entry) {
  // Built-in connectors own their appearance; the icon field is for remote entries.
  if (!["http", "sse"].includes(entry.transport)) return entry;
  const icon = manifest.connectors[entry.name]?.icon;
  if (!icon) return entry;
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(icon) || icon.length > 4096)
    throw Error("Ícone fora do formato ou limite aceito pelo Claude.");
  return { ...entry, icon };
}

export function configureDesktopMcpIcons(root, apply = false) {
  const library = path.join(root, "configLibrary");
  const meta = JSON.parse(fs.readFileSync(path.join(library, "_meta.json"), "utf8"));
  if (!/^[a-f0-9-]{36}$/i.test(meta.appliedId || "")) throw Error("Perfil ativo inválido.");
  const filename = path.join(library, `${meta.appliedId}.json`);
  const original = fs.readFileSync(filename, "utf8");
  const profile = JSON.parse(original);
  if (
    profile.inferenceProvider !== "gateway" ||
    profile.inferenceGatewayBaseUrl?.replace(/\/$/, "") !== "https://api.delvertokens.store"
  )
    throw Error("O perfil ativo não usa o nosso gateway. Nenhum arquivo foi alterado.");
  if (!Array.isArray(profile.managedMcpServers)) throw Error("Lista MCP existente inválida.");
  const updated = [],
    native = [],
    missing = [];
  const servers = profile.managedMcpServers.map((entry) => {
    if (entry.server) {
      native.push(entry.name);
      return entry;
    }
    const next = withConnectorIcon(entry);
    if (!next.icon) missing.push(entry.name);
    if (next.icon !== entry.icon) updated.push(entry.name);
    return next;
  });
  if (apply && updated.length) {
    const backupDir = path.join(root, "gateway-mcp-backups");
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      path.join(backupDir, `${meta.appliedId}-icons-${randomUUID()}.json`),
      original,
      { mode: 0o600, flag: "wx" },
    );
    profile.managedMcpServers = servers;
    const temporary = filename + ".gateway-icons.tmp";
    fs.writeFileSync(temporary, JSON.stringify(profile, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    fs.renameSync(temporary, filename);
  }
  return {
    applied: apply && updated.length > 0,
    total: servers.length,
    updated,
    native,
    missing,
    restartRequired: apply && updated.length > 0,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.env.LOCALAPPDATA)
      throw Error("Use o configurador no Windows com o perfil Claude-3p.");
    console.log(
      JSON.stringify(
        configureDesktopMcpIcons(
          path.join(process.env.LOCALAPPDATA, "Claude-3p"),
          process.argv.includes("--apply"),
        ),
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
