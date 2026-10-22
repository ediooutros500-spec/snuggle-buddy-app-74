import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type AdminRole = "admin" | "operator" | "viewer";
export type AdminUser = {
  id: string;
  username: string;
  role: AdminRole;
  enabled: boolean;
  passwordHash: string;
  version: number;
  createdAt: string;
};
type Audit = { id: string; at: string; actorId: string; action: string; resourceId: string };
type Store = { users: AdminUser[]; audit: Audit[] };
let queue: Promise<unknown> = Promise.resolve();

const directory = () => {
  if (process.env["GATEWAY_ROLE"] !== "central") throw new Error("admin_store_disabled");
  const value = process.env["GATOR_ADMIN_DATA_DIR"];
  if (!value) throw new Error("admin_store_not_configured");
  return value;
};
const derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
export async function hashAdminPassword(password: string): Promise<string> {
  if (password.length < 14 || password.length > 256) throw new Error("password_length");
  const salt = randomBytes(16);
  return `scrypt-v1:${salt.toString("hex")}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyAdminPassword(password: string, stored: string): Promise<boolean> {
  const match = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(stored);
  if (!match || password.length > 256) return false;
  const actual = await derive(password, Buffer.from(match[1]!, "hex"));
  return timingSafeEqual(actual, Buffer.from(match[2]!, "hex"));
}
export const publicAdminUser = (user: AdminUser) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  enabled: user.enabled,
  createdAt: user.createdAt,
});
async function readStore(): Promise<Store> {
  const dir = directory();
  try {
    const store = JSON.parse(await readFile(join(dir, "accounts.json"), "utf8")) as Store;
    if (!Array.isArray(store.users) || !Array.isArray(store.audit))
      throw new Error("invalid_admin_store");
    return store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const hash = process.env["GATOR_ADMIN_BOOTSTRAP_PASSWORD_HASH"] || "";
    if (!/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash))
      throw new Error("admin_bootstrap_missing");
    const username = process.env["GATOR_ADMIN_BOOTSTRAP_USERNAME"] || "admin";
    const store: Store = {
      users: [
        {
          id: randomUUID(),
          username,
          role: "admin",
          enabled: true,
          passwordHash: hash,
          version: 1,
          createdAt: new Date().toISOString(),
        },
      ],
      audit: [],
    };
    await saveStore(store);
    return store;
  }
}
async function saveStore(store: Store) {
  const dir = directory();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const temporary = join(dir, `accounts-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(store), { mode: 0o600, flag: "wx" });
  await rename(temporary, join(dir, "accounts.json"));
}
async function transaction<T>(run: (store: Store) => Promise<T> | T, write = false): Promise<T> {
  const task = queue.then(async () => {
    const store = await readStore();
    const result = await run(store);
    if (write) await saveStore(store);
    return result;
  });
  queue = task.catch(() => {});
  return task;
}
function audit(store: Store, actorId: string, action: string, resourceId: string) {
  store.audit.push({ id: randomUUID(), at: new Date().toISOString(), actorId, action, resourceId });
  if (store.audit.length > 10000) store.audit.splice(0, store.audit.length - 10000);
}
export const findAdminUser = (username: string) =>
  transaction((s) => s.users.find((u) => u.username === username));
export const findAdminById = (id: string) => transaction((s) => s.users.find((u) => u.id === id));
export const listAdminUsers = () => transaction((s) => s.users.map(publicAdminUser));
export const listAdminAudit = () => transaction((s) => s.audit.slice(-100).reverse());
export const recordAdminAudit = (actorId: string, action: string, resourceId: string) =>
  transaction((s) => audit(s, actorId, action, resourceId), true);
export async function createAdminUser(
  actorId: string,
  username: string,
  password: string,
  role: AdminRole,
) {
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username) || !["admin", "operator", "viewer"].includes(role))
    throw new Error("invalid_user");
  const passwordHash = await hashAdminPassword(password);
  return transaction((s) => {
    if (s.users.length >= 200 || s.users.some((u) => u.username === username))
      throw new Error("user_exists_or_limit");
    const user: AdminUser = {
      id: randomUUID(),
      username,
      passwordHash,
      role,
      enabled: true,
      version: 1,
      createdAt: new Date().toISOString(),
    };
    s.users.push(user);
    audit(s, actorId, "user.create", user.id);
    return publicAdminUser(user);
  }, true);
}
export async function updateAdminUser(
  actorId: string,
  id: string,
  patch: { enabled?: boolean; role?: AdminRole; password?: string },
) {
  const passwordHash =
    patch.password === undefined ? undefined : await hashAdminPassword(patch.password);
  return transaction((s) => {
    const user = s.users.find((u) => u.id === id);
    if (!user) throw new Error("user_not_found");
    if (patch.role !== undefined && !["admin", "operator", "viewer"].includes(patch.role))
      throw new Error("invalid_role");
    if (patch.enabled !== undefined && typeof patch.enabled !== "boolean")
      throw new Error("invalid_enabled");
    if (
      user.role === "admin" &&
      user.enabled &&
      (patch.enabled === false || (patch.role && patch.role !== "admin")) &&
      !s.users.some((u) => u.id !== id && u.enabled && u.role === "admin")
    )
      throw new Error("last_admin");
    if (patch.role) user.role = patch.role;
    if (patch.enabled !== undefined) user.enabled = patch.enabled;
    if (passwordHash) user.passwordHash = passwordHash;
    user.version++;
    audit(s, actorId, "user.update", user.id);
    return publicAdminUser(user);
  }, true);
}
