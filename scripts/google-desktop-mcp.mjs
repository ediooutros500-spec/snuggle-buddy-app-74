export const GOOGLE_SERVICES = [
  ["gmail", "Gmail", "gmailmcp"],
  ["google-drive", "Google Drive", "drivemcp"],
  ["google-calendar", "Google Calendar", "calendarmcp"],
  ["google-docs", "Google Docs", "docsmcp"],
  ["google-sheets", "Google Sheets", "sheetsmcp"],
  ["google-slides", "Google Slides", "slidesmcp"],
];
export function googleDefinitions(download) {
  const client = download?.installed || download?.web;
  if (
    !client ||
    typeof client.client_id !== "string" ||
    !/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(client.client_id) ||
    typeof client.client_secret !== "string" ||
    !client.client_secret.startsWith("GOCSPX-") ||
    /\s/.test(client.client_secret)
  )
    throw Error(
      "Arquivo OAuth Google inválido. Use o JSON baixado do Google Cloud; valores não foram exibidos.",
    );
  const redirects = GOOGLE_SERVICES.map((_, index) => `http://127.0.0.1:${53301 + index}/callback`);
  if (
    download.web &&
    (!Array.isArray(client.redirect_uris) ||
      redirects.some((uri) => !client.redirect_uris.includes(uri)))
  )
    throw Error(
      "Cadastre no cliente OAuth web os seis retornos 127.0.0.1 das portas 53301 a 53306, caminho /callback, e baixe novamente o JSON.",
    );
  return GOOGLE_SERVICES.map(([id, name, host], index) => ({
    id,
    entry: {
      name,
      transport: "http",
      url: `https://${host}.googleapis.com/mcp/v1`,
      oauth: {
        clientId: client.client_id,
        clientSecret: client.client_secret,
        authorizationServer: ["https://accounts.google.com"],
        callbackHost: "127.0.0.1",
        callbackPort: 53301 + index,
      },
    },
  }));
}
