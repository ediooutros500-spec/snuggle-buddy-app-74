import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { googleDefinitions } from "./google-desktop-mcp.mjs";
const registry = createRequire(import.meta.url)("../backend/mcp/registry.json").connectors;

// Changes only the active third-party profile, with a private backup and an atomic rename.
export function configureDesktopMcp(
  root,
  apply = false,
  connector = "context7",
  googleOauth = null,
) {
  const choices =
    connector === "google"
      ? googleDefinitions(googleOauth)
      : connector === "all"
        ? registry.filter((x) => x.entry)
        : registry.filter((x) => x.id === connector && x.entry);
  if (!choices.length) throw Error("Conector fora do piloto aprovado ou com requisitos pendentes.");
  const entry = choices[0].entry;
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
  if (profile.managedMcpServers !== undefined && !Array.isArray(profile.managedMcpServers))
    throw Error("Lista MCP existente inválida. Nenhum arquivo foi alterado.");
  const servers = profile.managedMcpServers || [];
  const additions = choices
    .map((x) => x.entry)
    .filter(
      (entry) =>
        !servers.some(
          (x) => x.name?.toLowerCase() === entry.name.toLowerCase() || x.url === entry.url,
        ),
    );
  if (!additions.length)
    return {
      applied: false,
      alreadyPresent: true,
      connector: connector === "all" ? "all" : entry.name,
    };
  if (apply) {
    const backupDir = path.join(root, "gateway-mcp-backups");
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(backupDir, `${meta.appliedId}-${Date.now()}.json`), original, {
      mode: 0o600,
      flag: "wx",
    });
    profile.managedMcpServers = [...servers, ...additions];
    const temporary = filename + ".gateway-mcp.tmp";
    fs.writeFileSync(temporary, JSON.stringify(profile, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    fs.renameSync(temporary, filename);
  }
  return {
    applied: apply,
    connector: entry.name,
    previousServers: servers.length,
    added: additions.map((x) => x.name),
    pending:
      connector === "all"
        ? registry
            .filter((x) => !x.entry)
            .map((x) => ({ name: x.name, requirement: x.requirement }))
        : [],
    restartRequired: apply,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))
) {
  try {
    const root =
      process.platform === "win32"
        ? path.join(process.env.LOCALAPPDATA, "Claude-3p")
        : path.join(os.homedir(), "Library/Application Support/Claude-3p");
    const option = process.argv.indexOf("--connector");
    const connector = option < 0 ? "context7" : process.argv[option + 1];
    let googleOauth = null;
    if (connector === "google") {
      const fileOption = process.argv.indexOf("--google-oauth-file");
      if (fileOption < 0 || !process.argv[fileOption + 1])
        throw Error(
          "Informe --google-oauth-file com o JSON privado do Google Cloud. Não envie a credencial no chat.",
        );
      googleOauth = JSON.parse(fs.readFileSync(process.argv[fileOption + 1], "utf8"));
    }
    console.log(
      JSON.stringify(
        configureDesktopMcp(root, process.argv.includes("--apply"), connector, googleOauth),
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
