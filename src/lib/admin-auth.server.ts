import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  findAdminById,
  findAdminUser,
  publicAdminUser,
  recordAdminAudit,
  verifyAdminPassword,
  type AdminRole,
} from "./admin-store.server";

const COOKIE = "__Host-gateway_admin";
const sessions = new Map<
  string,
  { userId: string; version: number; expires: number; lastSeen: number }
>();
const attempts = new Map<string, { count: number; expires: number }>();
const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const adminJson = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
export function sameAdminOrigin(request: Request): boolean {
  const expected = process.env["PARENT_PUBLIC_URL"]?.replace(/\/+$/, "");
  const origin = request.headers.get("origin");
  if (!expected || origin !== expected) return false;
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
function tokenCookie(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1) || ""
  );
}
const cookie = (token: string, seconds: number) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`;
export async function adminIdentity(request: Request) {
  const token = tokenCookie(request);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const key = digest(token);
  const session = sessions.get(key);
  const now = Date.now();
  if (!session || session.expires <= now || now - session.lastSeen >= IDLE_MS) {
    sessions.delete(key);
    return null;
  }
  try {
    const user = await findAdminById(session.userId);
    if (!user?.enabled || user.version !== session.version) {
      sessions.delete(key);
      return null;
    }
    session.lastSeen = now;
    return publicAdminUser(user);
  } catch {
    return null;
  }
}
export async function authorizeAdmin(
  request: Request,
  permission: "read" | "write" | "security" = "read",
): Promise<{ ok: true; actorId: string; role: AdminRole } | { ok: false; status: number }> {
  const identity = await adminIdentity(request);
  if (identity) {
    if (!["GET", "HEAD"].includes(request.method) && !sameAdminOrigin(request))
      return { ok: false, status: 403 };
    if (
      (permission === "security" && identity.role !== "admin") ||
      (permission === "write" && identity.role === "viewer")
    )
      return { ok: false, status: 403 };
    return { ok: true, actorId: identity.id, role: identity.role };
  }
  // Explicit migration-only switch. Browser UI always uses a session, never this token.
  if (process.env["GATOR_ALLOW_LEGACY_ADMIN_TOKEN"] === "true") {
    const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    const expected =
      process.env["GATOR_ADMIN_TOKEN"] || process.env["CLAUDE_CODE_GATEWAY_TOKEN"] || "";
    if (
      expected &&
      actual &&
      timingSafeEqual(Buffer.from(digest(actual)), Buffer.from(digest(expected)))
    )
      return { ok: true, actorId: "legacy-token", role: "admin" };
  }
  return { ok: false, status: 401 };
}
function attemptAllowed(username: string) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
  if (attempts.size >= 1000 && !attempts.has(username)) return false;
  for (const [key, limit, duration] of [
    ["global", 30, 60000],
    [`user:${username}`, 5, 300000],
  ] as const) {
    const bucket = attempts.get(key) || { count: 0, expires: now + duration };
    if (bucket.count >= limit) return false;
    bucket.count++;
    attempts.set(key, bucket);
  }
  return true;
}
export async function handleAdminSession(request: Request): Promise<Response> {
  if (process.env["GATEWAY_ROLE"] !== "central")
    return adminJson({ error: "Administrative login unavailable" }, 503);
  if (request.method === "GET") {
    const identity = await adminIdentity(request);
    return adminJson({ authenticated: Boolean(identity), user: identity });
  }
  if (!sameAdminOrigin(request)) return adminJson({ error: "Origin not allowed" }, 403);
  if (request.method === "DELETE") {
    const identity = await adminIdentity(request);
    if (identity) await recordAdminAudit(identity.id, "session.logout", identity.id);
    sessions.delete(digest(tokenCookie(request)));
    return adminJson({ ok: true }, 200, { "set-cookie": cookie("", 0) });
  }
  if (request.method !== "POST") return adminJson({ error: "Method not allowed" }, 405);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    return adminJson({ error: "JSON required" }, 415);
  const raw = await request.text();
  if (raw.length > 4096) return adminJson({ error: "Payload too large" }, 413);
  let body: { username?: unknown; password?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return adminJson({ error: "Invalid JSON" }, 400);
  }
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!attemptAllowed(username.slice(0, 64)))
    return adminJson({ error: "Too many login attempts" }, 429, { "retry-after": "300" });
  try {
    const user = await findAdminUser(username);
    const dummy = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;
    const accepted = await verifyAdminPassword(password, user?.passwordHash || dummy);
    if (!user?.enabled || !accepted)
      return adminJson({ error: "Usuário ou senha inválidos." }, 401);
    const now = Date.now();
    for (const [key, session] of sessions)
      if (session.expires <= now || now - session.lastSeen >= IDLE_MS) sessions.delete(key);
    if (sessions.size >= 1000) return adminJson({ error: "Session capacity reached" }, 503);
    await recordAdminAudit(user.id, "session.login", user.id);
    const token = randomBytes(32).toString("hex");
    sessions.set(digest(token), {
      userId: user.id,
      version: user.version,
      expires: now + ABSOLUTE_MS,
      lastSeen: now,
    });
    return adminJson({ authenticated: true, user: publicAdminUser(user) }, 200, {
      "set-cookie": cookie(token, ABSOLUTE_MS / 1000),
    });
  } catch {
    return adminJson({ error: "Administrative login unavailable" }, 503);
  }
}
