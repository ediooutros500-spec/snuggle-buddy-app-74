export type ProviderFailure = { status: number; type: string; message: string; diagnostic: string };
export async function readProviderFailure(
  response: Response,
  apiKey: string,
): Promise<ProviderFailure> {
  let value: unknown;
  try {
    value = await response.clone().json();
  } catch {
    value = null;
  }
  const error = value && typeof value === "object" && "error" in value ? value.error : null;
  let message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : typeof error === "string"
        ? error
        : "O provedor recusou a solicitação.";
  message = message
    .split(apiKey)
    .join("[credencial ocultada]")
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [ocultado]")
    .replace(/\b(?:sk-|sb_secret_|gh[opusr]_)[a-zA-Z0-9_-]{8,}/g, "[credencial ocultada]")
    .slice(0, 1200);
  const rawType = error && typeof error === "object" && "type" in error ? error.type : null;
  const type =
    typeof rawType === "string" && /^[a-z_]{1,60}$/.test(rawType) ? rawType : "api_error";
  const fields = [
    "model",
    "max_tokens",
    "thinking",
    "budget_tokens",
    "system",
    "messages",
    "tools",
    "tool_choice",
    "output_config",
    "effort",
    "cache_control",
    "context_management",
    "container",
    "mcp_servers",
    "metadata",
    "anthropic-beta",
  ].filter((field) => message.toLowerCase().includes(field));
  const reason = /not supported|unsupported|not allowed|unknown parameter/i.test(message)
    ? "unsupported_parameter"
    : /not enabled|beta/i.test(message)
      ? "feature_not_enabled"
      : /exceed|too long|too many|maximum/i.test(message)
        ? "limit_exceeded"
        : /must|required|invalid|expected/i.test(message)
          ? "invalid_request"
          : "unclassified";
  // Only classifications reach logs: never provider text or conversation values.
  return {
    status: response.status,
    type,
    message,
    diagnostic: `upstream HTTP ${response.status}; type=${type}; reason=${reason}; fields=${fields.join(",") || "unknown"}`,
  };
}
