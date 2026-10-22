import { createHmac, randomUUID } from "node:crypto";

import { CENTRAL_REGISTRATION_ORIGIN } from "./central-address";

export interface ChildConfig {
  gatorPublicUrl: string;
  registrationMode: "auto" | "signed";
  remixSyncSecret: string;
  lovableApiKey: string;
  workspaceLabel: string;
  accountLabel: string;
}

export function getChildConfig(): ChildConfig {
  const gatorPublicUrl = (
    process.env["GATOR_PUBLIC_URL"]?.trim() ||
    process.env["PARENT_GATEWAY_URL"]?.trim() ||
    CENTRAL_REGISTRATION_ORIGIN ||
    (process.env["NODE_ENV"] === "production" ? "" : "http://127.0.0.1:20128")
  )
    .trim()
    .replace(/\/+$/, "");

  const remixSyncSecret = (process.env["REMIX_SYNC_SECRET"] ?? "").trim();
  const lovableApiKey = (process.env["LOVABLE_API_KEY"] ?? "").trim();
  const workspaceLabel = (process.env["LOVABLE_WORKSPACE_LABEL"] ?? "default").trim();
  const accountLabel = (process.env["LOVABLE_ACCOUNT_LABEL"] ?? "default").trim();

  return {
    gatorPublicUrl,
    registrationMode: process.env["GATOR_REGISTRATION_MODE"] === "signed" ? "signed" : "auto",
    remixSyncSecret,
    lovableApiKey,
    workspaceLabel,
    accountLabel,
  };
}

export function isAllowedChildOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.origin !== origin) return false;
    if (url.protocol !== "https:") return false;
    return (
      url.hostname.endsWith(".lovable.app") ||
      url.hostname.endsWith(".lovableproject.com") ||
      url.hostname.endsWith(".lovable.dev")
    );
  } catch {
    return false;
  }
}

export function signHandshakePayload(
  secret: string,
  origin: string,
  timestamp: string,
  nonce: string,
  apiKey: string,
): string {
  const canonical = `${origin}|${timestamp}|${nonce}|${apiKey}`;
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export function createSignedHandshakeHeaders(
  secret: string,
  origin: string,
  apiKey: string,
): Record<string, string> {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = signHandshakePayload(secret, origin, timestamp, nonce, apiKey);
  return {
    "x-handshake-origin": origin,
    "x-handshake-timestamp": timestamp,
    "x-handshake-nonce": nonce,
    "x-handshake-signature": signature,
  };
}
