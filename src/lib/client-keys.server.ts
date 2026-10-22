import { createHash, randomBytes } from "node:crypto";

export const createClientKey = () => `gw_${randomBytes(32).toString("hex")}`;
export function storedClientKey(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex");
  return `gw_hash_v1:${key.slice(0, 7)}:${key.slice(-4)}:${hash}`;
}
export function clientKeyHint(stored: string): string {
  if (stored.startsWith("gw_hash_v1:")) {
    const [, first, last] = stored.split(":");
    return `${first}…${last}`;
  }
  return stored.length > 8 ? `${stored.slice(0, 7)}…${stored.slice(-4)}` : "••••";
}
