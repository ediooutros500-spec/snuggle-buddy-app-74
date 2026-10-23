export function githubDefinitions(clientId) {
  if (typeof clientId !== "string" || !/^(?:[a-fA-F0-9]{20}|Ov23li[A-Za-z0-9]{14})$/.test(clientId))
    throw Error(
      "Informe o Client ID público de um OAuth App GitHub com Device Flow habilitado. Não use token ou Client Secret.",
    );
  return [{ id: "github", entry: { name: "GitHub", server: "github", clientId } }];
}
