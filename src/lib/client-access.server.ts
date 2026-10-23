import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Device = { hash: string; firstSeen: string; lastSeen: string; requests: number };
type Access = {
  expiresAt: string | null;
  deviceLimit: number;
  devices: Device[];
  unidentifiedRequests: number;
};
type Store = Record<string, Access>;
let queue: Promise<unknown> = Promise.resolve();
const empty = (): Access => ({
  expiresAt: null,
  deviceLimit: 0,
  devices: [],
  unidentifiedRequests: 0,
});
async function transaction<T>(run: (store: Store) => T, write = false): Promise<T> {
  const task = queue.then(async () => {
    const directory = process.env["GATOR_ADMIN_DATA_DIR"];
    if (process.env["GATEWAY_ROLE"] !== "central" || !directory)
      throw new Error("client_access_unavailable");
    const file = join(directory, "client-access.json");
    let store: Store;
    try {
      store = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      store = {};
    }
    const result = run(store);
    if (write) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const temp = join(directory, `client-access-${randomUUID()}.tmp`);
      await writeFile(temp, JSON.stringify(store), { mode: 0o600, flag: "wx" });
      await rename(temp, file);
    }
    return result;
  });
  queue = task.catch(() => {});
  return task;
}
export function accessPatch(body: Record<string, unknown>) {
  const patch: Partial<Pick<Access, "expiresAt" | "deviceLimit">> = {};
  if ("validity_days" in body) {
    if (
      ![0, 1, 7, 15, 30].includes(Number(body["validity_days"])) ||
      typeof body["validity_days"] !== "number"
    )
      throw new Error("Validade inválida.");
    patch.expiresAt =
      body["validity_days"] === 0
        ? null
        : new Date(Date.now() + Number(body["validity_days"]) * 86400000).toISOString();
  }
  if ("device_limit" in body) {
    if (
      !Number.isInteger(body["device_limit"]) ||
      Number(body["device_limit"]) < 0 ||
      Number(body["device_limit"]) > 100
    )
      throw new Error("Limite de dispositivos deve ser entre 0 e 100.");
    patch.deviceLimit = Number(body["device_limit"]);
  }
  return patch;
}
export const saveClientAccess = (
  id: string,
  patch: ReturnType<typeof accessPatch>,
  reset = false,
) =>
  transaction((store) => {
    const row = store[id] || empty();
    Object.assign(row, patch);
    if (reset) row.devices = [];
    store[id] = row;
  }, true);
export const listClientAccess = () =>
  transaction((store) =>
    Object.fromEntries(
      Object.entries(store).map(([id, row]) => [
        id,
        {
          expires_at: row.expiresAt,
          device_limit: row.deviceLimit,
          device_count: row.devices.length,
          unidentified_requests: row.unidentifiedRequests,
          devices: row.devices.map((d, i) => ({
            name: `Dispositivo ${i + 1}`,
            first_seen: d.firstSeen,
            last_seen: d.lastSeen,
            requests: d.requests,
          })),
        },
      ]),
    ),
  );
export async function checkClientAccess(
  request: Request,
  id: string,
  observe = true,
): Promise<boolean> {
  // Child deployments keep their existing authentication; this store belongs to the central VPS.
  if (process.env["GATEWAY_ROLE"] !== "central") return true;
  return transaction((store) => {
    const row = store[id] || empty();
    if (row.expiresAt && Date.parse(row.expiresAt) <= Date.now()) return false;
    const value = request.headers.get("x-device-id")?.trim();
    if (value && !/^[a-zA-Z0-9._:-]{8,128}$/.test(value)) return false;
    if (!value) {
      if (row.deviceLimit > 0) return false;
      row.unidentifiedRequests++;
    } else {
      const hash = createHash("sha256").update(`${id}:${value}`).digest("hex");
      const device = row.devices.find((d) => d.hash === hash);
      const now = new Date().toISOString();
      if (device) {
        device.lastSeen = now;
        device.requests++;
      } else {
        if (row.deviceLimit && row.devices.length >= row.deviceLimit) return false;
        if (row.devices.length < 100)
          row.devices.push({ hash, firstSeen: now, lastSeen: now, requests: 1 });
      }
    }
    store[id] = row;
    return true;
  }, observe);
}
